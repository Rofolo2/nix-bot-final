// ==================== TRUCO PARA RENDER GRATIS ====================
// Abre un puerto web ficticio para evitar el error "Port scan timeout"
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot Online y Servidor Activo');
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Puerto detectado con éxito: ${port}`);
});
// ==================================================================

const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
// ... (Todo el resto del código queda exactamente igual)


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Variable global para almacenar el sorteo activo en la memoria
global.sorteoActivo = null;

client.once('ready', () => {
    console.log(`¡Bot conectado correctamente como ${client.user.tag}!`);
});

// ==================== MANEJADOR DE INTERACCIONES (COMANDOS /) ====================
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    // --- COMANDO: DECIR ---
    if (commandName === 'decir') {
        await interaction.deferReply({ flags: 64 });
        const mensaje = options.getString('mensaje');
        await interaction.channel.send(mensaje);
        await interaction.editReply({ content: '✅ Mensaje enviado con éxito.' });
    }

    // --- COMANDO: CREAR SORTEO ---
    else if (commandName === 'crear-sorteo') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ No tienes permisos para usar este comando.', flags: 64 });
        }

        await interaction.deferReply();

        const premio = options.getString('objeto');
        const cantidadGanadores = options.getInteger('ganadores') || 1; 
        const imagen = options.getAttachment('imagen');
        const mensajeExtra = options.getString('mensaje') || '¡Reacciona con 🎉 para participar en este sorteo!';

        const timestampAhora = Math.floor(Date.now() / 1000);
        const horaDiscord = `<t:${timestampAhora}:t>`; 

        const embedConfig = new EmbedBuilder()
            .setTitle('🎁 ¡NUEVO SORTEO ACTIVO! 🎁')
            .setDescription(`${mensajeExtra}\n\nPara entrar, simplemente presiona el botón de **🎉** aquí abajo.`)
            .addFields(
                { name: '🏆 Premio', value: `**${premio}**`, inline: true },
                { name: '👥 Ganadores', value: `**${cantidadGanadores}**`, inline: true },
                { name: '⏰ Iniciado a las', value: horaDiscord, inline: true }
            )
            .setColor('#1E90FF')
            .setFooter({ text: 'NombaX Sorteos • ¡Buena suerte a todos!' })
            .setTimestamp();

        if (imagen) {
            embedConfig.setImage(imagen.url);
        }

        const mensajeSorteo = await interaction.editReply({ embeds: [embedConfig] });
        await mensajeSorteo.react('🎉');

        global.sorteoActivo = {
            premio: premio,
            ganadoresRequeridos: cantidadGanadores,
            imagenUrl: imagen ? imagen.url : null,
            mensajeId: mensajeSorteo.id,
            canalId: interaction.channel.id
        };
    }

    // --- COMANDO: SORTEAR ---
    else if (commandName === 'sortear') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ No tienes permisos para usar este comando.', flags: 64 });
        }
        if (!global.sorteoActivo) {
            return interaction.reply({ content: '❌ No hay ningún sorteo activo en este momento.', flags: 64 });
        }

        await interaction.deferReply();

        try {
            const canal = await interaction.guild.channels.fetch(global.sorteoActivo.canalId);
            const mensajeOriginal = await canal.messages.fetch(global.sorteoActivo.mensajeId);
            const reaccionTada = mensajeOriginal.reactions.cache.get('🎉');

            let participantes = [];
            if (reaccionTada) {
                const usuariosReaccion = await reaccionTada.users.fetch();
                participantes = Array.from(usuariosReaccion.values()).filter(user => !user.bot);
            } else {
                return interaction.editReply({ content: '❌ No se encontraron participantes activos en el emoji 🎉.' });
            }

            if (participantes.length === 0) {
                return interaction.editReply({ content: '❌ El sorteo no puede realizarse porque nadie ha reaccionado con 🎉 todavía.' });
            }

            await interaction.editReply('📦 **|** _Barajando la lista de participantes y seleccionando boletos de forma segura..._');

            setTimeout(async () => {
                try {
                    const numGanadoresBuscados = global.sorteoActivo.ganadoresRequeridos;
                    const ganadoresElegidos = [];
                    const copiaParticipantes = [...participantes];
                    
                    const totalGanadoresReales = Math.min(numGanadoresBuscados, copiaParticipantes.length);

                    for (let i = 0; i < totalGanadoresReales; i++) {
                        const indiceAleatorio = Math.floor(Math.random() * copiaParticipantes.length);
                        const [ganador] = copiaParticipantes.splice(indiceAleatorio, 1);
                        ganadoresElegidos.push(ganador);
                    }

                    const textoMenciones = ganadoresElegidos.map((g, index) => `${index + 1}. <@${g.id}> (**${g.username}**)`).join('\n');

                    const embedGanador = new EmbedBuilder()
                        .setTitle(totalGanadoresReales > 1 ? '🎉 ¡RESULTADOS DEL SORTEO! 🎉' : '🎉 ¡TENEMOS UN GANADOR! 🎉')
                        .setDescription(`El sorteo ha concluido exitosamente entre los **${participantes.length}** participantes del servidor.`)
                        .addFields(
                            { name: '🏆 Objeto Sorteado', value: `**${global.sorteoActivo.premio}**`, inline: false },
                            { name: totalGanadoresReales > 1 ? '👑 Lista de Ganadores' : '👑 Ganador(a)', value: textoMenciones, inline: false }
                        )
                        .setColor('#00FF00')
                        .setFooter({ text: 'NombaX Sorteos • ¡Felicidades a los afortunados!' })
                        .setTimestamp();

                    if (global.sorteoActivo.imagenUrl) {
                        embedGanador.setThumbnail(global.sorteoActivo.imagenUrl);
                    }

                    const m = ganadoresElegidos.map(g => `<@${g.id}>`).join(' ');
                    
                    await interaction.editReply({ content: `¡Sorteo finalizado! 🏆 ${m}`, embeds: [embedGanador] });

                    const nombreCanalNews = '〔👑〕news';
                    const canalNews = interaction.guild.channels.cache.find(c => c.name === nombreCanalNews && c.isTextBased());
                    if (canalNews) {
                        await canalNews.send({
                            content: `📢 **¡Atención Comunidad!** Felicidades a ${m} por haber ganado el sorteo de **${global.sorteoActivo.premio}** 👑🎉`
                        });
                    }

                    global.sorteoActivo = null;
                } catch (innerError) {
                    console.error('Error dentro del temporizador del sorteo:', innerError);
                }
            }, 2500);

        } catch (error) {
            console.error('Error al ejecutar el sorteo:', error);
            await interaction.editReply({ content: '❌ Hubo un problema técnico al intentar procesar el sorteo.' }).catch(() => {});
        }
    }
});

// ==================== EVENTO DE BIENVENIDA AUTOMÁTICO ====================
client.on('guildMemberAdd', async (member) => {
    try {
        const nombreCanalBienvenida = '〔💬〕general'; 
        const nombreCanalRoles = 'roles';
        const nombreCanalReglas = 'reglas';

        const canal = member.guild.channels.cache.find(c => c.name === nombreCanalBienvenida && c.isTextBased());
        if (!canal) return;

        const canalRoles = member.guild.channels.cache.find(c => c.name === nombreCanalRoles);
        const canalReglas = member.guild.channels.cache.find(c => c.name === nombreCanalReglas);

        const mencionRoles = canalRoles ? `<#${canalRoles.id}>` : `#${nombreCanalRoles}`;
        const mencionReglas = canalReglas ? `<#${canalReglas.id}>` : `#${nombreCanalReglas}`;

        await canal.send({
            content: `_Hola <@${member.id}> bienvenido al sunshine ☀️_\n\n_• 🎭 Puedes elegir tus roles en el canal ${mencionRoles} para personalizar tu perfil._\n_• 📜 Lee detenidamente las ${mencionReglas} del servidor para conocer las normas de convivencia y evitar sanciones por parte de la administración._\n\n_Una vez hecho esto, eres libre de integrarte a los canales de texto y voz. ¡Diviértete!_`
        });
    } catch (error) {
        console.error("Error crítico procesando la bienvenida:", error);
    }
});

// Lee directamente el TOKEN del panel de Render
client.login(process.env.TOKEN);
