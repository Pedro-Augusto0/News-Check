import type { NewsClientMatch } from '@/features/news'
import type { ReviewQueueItem } from '../model'

export interface GroupedClientChannel {
  channelName: string
  keywords: string[]
}

export interface GroupedClientMatch {
  customerName: string
  channels: GroupedClientChannel[]
}

function mergeKeywords(current: string[], incoming: string[]): string[] {
  const seen = new Set(current.map((keyword) => keyword.toLocaleLowerCase('pt-BR')))
  const merged = [...current]
  for (const keyword of incoming) {
    const trimmed = keyword.trim()
    if (!trimmed) continue
    const key = trimmed.toLocaleLowerCase('pt-BR')
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(trimmed)
  }
  return merged
}

export function groupClientMatches(matches: NewsClientMatch[]): GroupedClientMatch[] {
  const groups: GroupedClientMatch[] = []
  const index = new Map<string, GroupedClientMatch>()

  for (const match of matches) {
    const customerName = match.customerName.trim() || 'Cliente'
    const customerKey = customerName.toLocaleLowerCase('pt-BR')
    let group = index.get(customerKey)
    if (!group) {
      group = { customerName, channels: [] }
      index.set(customerKey, group)
      groups.push(group)
    }

    const channelName = match.channelName.trim()
    const channelKey = channelName.toLocaleLowerCase('pt-BR')
    const existing = group.channels.find(
      (channel) => channel.channelName.toLocaleLowerCase('pt-BR') === channelKey,
    )
    if (existing) {
      existing.keywords = mergeKeywords(existing.keywords, match.keywords)
      continue
    }

    group.channels.push({
      channelName,
      keywords: mergeKeywords([], match.keywords),
    })
  }

  return groups
}

export function resolveClientMatchGroups(
  item: Pick<ReviewQueueItem, 'clientMatches' | 'clientKeywords' | 'customerNames'>,
): GroupedClientMatch[] {
  if (item.clientMatches.length > 0) return groupClientMatches(item.clientMatches)

  if (item.customerNames.length === 1) {
    return [
      {
        customerName: item.customerNames[0],
        channels:
          item.clientKeywords.length > 0
            ? [{ channelName: '', keywords: [...item.clientKeywords] }]
            : [],
      },
    ]
  }

  if (item.customerNames.length > 1) {
    return item.customerNames.map((customerName) => ({
      customerName,
      channels: [],
    }))
  }

  if (item.clientKeywords.length > 0) {
    return [
      {
        customerName: 'Cliente',
        channels: [{ channelName: '', keywords: [...item.clientKeywords] }],
      },
    ]
  }

  return []
}
