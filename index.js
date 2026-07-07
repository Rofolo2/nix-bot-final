// ==================== SERVIDOR WEB PARA RENDER ====================
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot de Sorteos Activo y Despierto 🚀'));
app.listen(port, '0.0.0.0', () => console.log(`Puerto detectado: ${port}`));
// ==================================================================

require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Memoria del sorteo
global.sorteoActivo = null;

client.once('ready', () => {
    console.log(`¡Bot conectado exitosamente como ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options } = interaction;

    // --- COMANDO: DECIR ---
    if (commandName === 'decir') {
        const mensaje = options.getString('mensaje');
        await interaction.reply({ content: 'Mensaje enviado.', flags: 64 });
        await interaction.channel.send(mensaje);
    }

    // --- COMANDO: CREAR SORTEO ---
    else if (commandName === 'crear-sorteo') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ No tienes permisos.', flags: 64 });
        }

        await interaction.deferReply();
        const premio = options.getString('objeto');
        const cantidadGanadores = options.getInteger('ganadores') || 1; 
        const imagen = options.getAttachment('imagen');
        const mensajeExtra = options.getString('mensaje') || '¡Reacciona con 🎉 para participar!';

        const embedConfig = new EmbedBuilder()
            .setTitle('🎁 ¡NUEVO SORTEO ACTIVO! 🎁')
            .setDescription(`${mensajeExtra}\n\nPara entrar, presiona el botón de **🎉** aquí abajo.`)
            .addFields(
                { name: '🏆 Premio', value: `**${premio}**`, inline: true },
                { name: '👥 Ganadores', value: `**${cantidadGanadores}**`, inline: true }
            )
            .setColor('#1E90FF')
            .setTimestamp();

        if (imagen) embedConfig.setImage(imagen.url);

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
            return interaction.reply({ content: '❌ No tienes permisos.', flags: 64 });
        }
        if (!global.sorteoActivo) {
            return interaction.reply({ content: '❌ No hay ningún sorteo activo.', flags: 64 });
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
            }

            if (participantes.length === 0) {
                return interaction.editReply({ content: '❌ Nadie ha reaccionado con 🎉 todavía.' });
            }

            await interaction.editReply('📦 **|** _Barajando la lista de participantes de forma segura..._');

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
                        .setDescription(`Sorteo concluido entre los **${participantes.length}** participantes.`)
                        .addFields(
                            { name: '🏆 Objeto Sorteado', value: `**${global.sorteoActivo.premio}**`, inline: false },
                            { name: '👑 Lista de Ganadores', value: textoMenciones, inline: false }
                        )
                        .setColor('#00FF00')
                        .setTimestamp();

                    if (global.sorteoActivo.imagenUrl) embedGanador.setThumbnail(global.sorteoActivo.imagenUrl);

                    const m = ganadoresElegidos.map(g => `<@${g.id}>`).join(' ');
                    await interaction.editReply({ content: `¡Sorteo finalizado! 🏆 ${m}`, embeds: [embedGanador] });

                    const canalNews = interaction.guild.channels.cache.find(c => c.name === '〔👑〕news' && c.isTextBased());
                    if (canalNews) {
                        await canalNews.send({ content: `📢 **¡Atención!** Felicidades a ${m} por ganar **${global.sorteoActivo.premio}** 👑🎉` });
                    }

                    global.sorteoActivo = null;
                } catch (e) { console.error(e); }
            }, 2500);

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Hubo un problema técnico.' }).catch(() => {});
        }
    }
});

// --- BIENVENIDA ---
client.on('guildMemberAdd', async (member) => {
    const canal = member.guild.channels.cache.find(c => c.name === '〔💬〕general' && c.isTextBased());
    if (!canal) return;
    
    const canalRoles = member.guild.channels.cache.find(c => c.name === 'roles');
    const canalReglas = member.guild.channels.cache.find(c => c.name === 'reglas');
    const mRoles = canalRoles ? `<#${canalRoles.id}>` : '#roles';
    const mReglas = canalReglas ? `<#${canalReglas.id}>` : '#reglas';

    await canal.send({
        content: `_Hola <@${member.id}> bienvenido al sunshine ☀️_\n\n_• 🎭 Elige tus roles en ${mRoles}_\n_• 📜 Lee las ${mReglas} para evitar sanciones._`
    });
});

client.login(process.env.TOKEN);
// El bot busca el TOKEN de Render. Si no lo encuentra, te avisará en la consola.
const tokenFinal = process.env.TOKEN;

if (!tokenFinal) {
    console.error("❌ ERROR CRÍTICO: El TOKEN está vacío en la pestaña Environment de Render.");
} else {
    client.login(tokenFinal).catch(err => {
        console.error("❌ ERROR DE CONEXIÓN CON DISCORD:", err.message);
    });
}

