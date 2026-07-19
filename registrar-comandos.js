const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('decir')
        .setDescription('Hace que el bot diga un mensaje')
        .addStringOption(o => o.setName('mensaje').setDescription('Mensaje a enviar').setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('crear-sorteo')
        .setDescription('Inicia un sorteo en el canal')
        .addStringOption(o => o.setName('objeto').setDescription('Premio del sorteo').setRequired(true))
        .addIntegerOption(o => o.setName('ganadores').setDescription('Cantidad de ganadores'))
        .addStringOption(o => o.setName('mensaje').setDescription('Mensaje extra o descripción'))
        .addAttachmentOption(o => o.setName('imagen').setDescription('Imagen del premio')),
    
    new SlashCommandBuilder()
        .setName('sortear')
        .setDescription('Saca los ganadores al azar del sorteo activo')
].map(cmd => cmd.toJSON());

// Función que será llamada desde el index.js de forma controlada
async function registrarComandos() {
    if (!process.env.TOKEN) {
        console.error('❌ [Comandos] No se pudo registrar: Falta la variable TOKEN.');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        console.log('🔄 [Comandos] Actualizando comandos de barra (/) en Discord...');
        await rest.put(
            Routes.applicationCommands('1513923903226122373'), // Tu ID de bot
            { body: commands }
        );
        console.log('✅ [Comandos] ¡Comandos globales cargados exitosamente!');
    } catch (error) {
        console.error('❌ [Comandos] Error al registrar los comandos:', error.message);
    }
}

module.exports = registrarComandos;
