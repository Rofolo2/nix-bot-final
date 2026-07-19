const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder().setName('decir').setDescription('Hace que el bot diga un mensaje').addStringOption(o => o.setName('mensaje').setDescription('Mensaje').setRequired(true)),
    new SlashCommandBuilder().setName('crear-sorteo').setDescription('Inicia un sorteo').addStringOption(o => o.setName('objeto').setDescription('Premio').setRequired(true)).addIntegerOption(o => o.setName('ganadores').setDescription('Cantidad de ganadores')).addStringOption(o => o.setName('mensaje').setDescription('Mensaje extra')).addAttachmentOption(o => o.setName('imagen').setDescription('Imagen')),
    new SlashCommandBuilder().setName('sortear').setDescription('Saca los ganadores al azar')
].map(cmd => cmd.toJSON());

// Usamos process.env.TOKEN directamente, alineado con tu panel de Render
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Actualizando comandos de barra (/) en Discord...');
        await rest.put(
            Routes.applicationCommands('1513923903226122373'), 
            { body: commands }
        );
        console.log('¡Comandos globales cargados exitosamente!');
    } catch (error) { 
        console.error('Error al registrar los comandos:', error); 
    }
})();
