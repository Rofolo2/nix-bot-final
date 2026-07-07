require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder().setName('decir').setDescription('Hace que el bot diga un mensaje').addStringOption(o => o.setName('mensaje').setDescription('Mensaje').setRequired(true)),
    new SlashCommandBuilder().setName('crear-sorteo').setDescription('Inicia un sorteo').addStringOption(o => o.setName('objeto').setDescription('Premio').setRequired(true)).addIntegerOption(o => o.setName('ganadores').setDescription('Cantidad de ganadores')).addStringOption(o => o.setName('mensaje').setDescription('Mensaje extra')).addAttachmentOption(o => o.setName('imagen').setDescription('Imagen')),
    new SlashCommandBuilder().setName('sortear').setDescription('Saca los ganadores al azar')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Actualizando comandos...');
        await rest.put(
            Routes.applicationCommands('1513923903226122373'), // Tu ID real de bot ya configurada [2xsgz]
            { body: commands }
        );
        console.log('¡Comandos cargados exitosamente!');
    } catch (error) { console.error(error); }
})();
