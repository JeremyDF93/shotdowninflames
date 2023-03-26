import fetch from 'node-fetch';
import { Client, Events, GatewayIntentBits, Partials, EmbedBuilder } from 'discord.js';
import * as dotenv from 'dotenv';

dotenv.config();

// Create a new client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions],
  partials: [Partials.Message, Partials.Reaction],
});

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  // When a reaction is received, check if the structure is partial
  if (reaction.partial) {
    // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Something went wrong when fetching the message:', error);
      // Return as `reaction.message.author` may be undefined/null
      return;
    }
  }

  if (reaction.emoji.name != 'ℹ️') return;

  if (reaction.message.attachments.size > 0) {
    const attachment = reaction.message.attachments.first(); //TODO: iterate through all attachments
    const embed = new EmbedBuilder()
      .setTitle('No Parameters')
      .setImage(attachment.url);

    if (attachment.url.endsWith('.png')) {
      const res = await fetch(attachment.url);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Loop through the PNG chunks and extract any textual data
      let offset = 8; // Start at byte 8 to skip the PNG header
      while (offset < buffer.length) {
        // Read the length and signature of the next chunk
        const length = buffer.readUInt32BE(offset);
        const type = buffer.toString('ascii', offset + 4, offset + 8);

        // Check if the chunk is a tEXt or iTXt chunk
        if (type === 'tEXt' || type === 'iTXt') {
          // Extract the text from the chunk
          const nullByteIndex = buffer.indexOf(0, offset + 8);
          const keyword = buffer.toString('ascii', offset + 8, nullByteIndex);
          const text = buffer.toString('utf8', nullByteIndex + 1, offset + 8 + length);

          //user.send(`${attachment.url}\n${keyword}\n\`\`\`${text}\`\`\``);

          embed.setTitle(keyword);
          embed.setDescription(text);
        }

        // Move to the next chunk
        offset += length + 12; // Length + signature (4 bytes each) + CRC (4 bytes)
      }
    }

    user.send({ embeds: [embed] });
  }
});

// Log in to Discord with your client's token
client.login(process.env.TOKEN);
