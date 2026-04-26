import { PermissionFlagsBits, type ChatInputCommandInteraction, type GuildMember } from 'discord.js';

export function isOwner(interaction: ChatInputCommandInteraction, ownerId: string): boolean {
  return interaction.user.id === ownerId;
}

export function isAdmin(interaction: ChatInputCommandInteraction): boolean {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
}

export function memberHasRole(member: GuildMember | null, roleId: string | null): boolean {
  if (!member || !roleId) return false;
  return member.roles.cache.has(roleId);
}
