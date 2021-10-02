import { BuiltInModule, CommandClient, ownerOnly, slashCommand, listener, SlashCommandCheckFailed } from '../../src'
import { CommandInteraction } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'

export class Dev extends BuiltInModule {
  constructor(private cts: CommandClient) {
    super()
  }

  @listener('slashCommandError')
  async slashError(e: Error, i: CommandInteraction) {
    if (e instanceof SlashCommandCheckFailed) {
      return i.reply({
        content: 'Command before-run check failed',
        ephemeral: true,
      })
    }
    console.error(e.message)
  }

  @slashCommand({
    command: new SlashCommandBuilder().setName('reload').setDescription('리로드 커맨드'),
  })
  @ownerOnly
  async reload(i: CommandInteraction) {
    const data = await this.cts.registry.reloadAll()
    await i.reply({
      ephemeral: true,
      content: '```\n' + data.map((x) => (x.success ? `✅ ${x.path}` : `❌ ${x.path}\n${x.error}`)).join('\n') + '```',
    })
  }
}

export function install(cts: CommandClient) {
  return new Dev(cts)
}