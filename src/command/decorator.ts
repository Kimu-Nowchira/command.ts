import { Context, Module } from '../structures'
import { ICommandDecorator, ICommandDecoratorOptions } from '..'
import { COMMANDS_KEY, COMMANDS_OWNER_ONLY_KEY } from '../constants'

export function command(
  opts: Partial<ICommandDecoratorOptions> = {},
): MethodDecorator {
  return (target, propertyKey) => {
    if (!(target instanceof Module)) {
      throw new TypeError('Class does not extends `Module` class.')
    }
    const types: Function[] = Reflect.getMetadata(
      'design:paramtypes',
      target,
      propertyKey,
    )
    const meta: ICommandDecorator = {
      aliases: opts.aliases || [],
      brief: opts.brief,
      description: opts.description,
      name: opts.name || (propertyKey as string),
      usesCtx: types[0] === Context,
      args: types.slice(1).map((x) => ({
        type: x,
        optional: false, // not implemented
      })),
      key: propertyKey as string,
    }
    const metas: ICommandDecorator[] =
      Reflect.getMetadata(COMMANDS_KEY, target) || []
    metas.push(meta)
    Reflect.defineMetadata(COMMANDS_KEY, metas, target)
  }
}

export const ownerOnly: MethodDecorator = (target, propertyKey) => {
  if (!(target instanceof Module)) {
    throw new TypeError('Class does not extends `Module` class.')
  }
  const list: Set<string> =
    Reflect.getMetadata(COMMANDS_OWNER_ONLY_KEY, target) || new Set()
  list.add(propertyKey as string)
  Reflect.defineMetadata(COMMANDS_OWNER_ONLY_KEY, list, target)
}
