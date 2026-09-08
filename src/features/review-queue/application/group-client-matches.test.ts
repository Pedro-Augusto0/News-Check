import { describe, expect, it } from 'vitest'
import { groupClientMatches, resolveClientMatchGroups } from './group-client-matches'

describe('groupClientMatches', () => {
  it('groups keywords by customer then channel', () => {
    expect(
      groupClientMatches([
        {
          customerName: 'Acme Ltda',
          channelName: 'Impresso',
          keywords: ['prefeitura', 'obra'],
        },
        {
          customerName: 'Acme Ltda',
          channelName: 'Digital',
          keywords: ['prefeitura'],
        },
        {
          customerName: 'Banco X',
          channelName: 'Impresso',
          keywords: ['juros'],
        },
      ]),
    ).toEqual([
      {
        customerName: 'Acme Ltda',
        channels: [
          { channelName: 'Impresso', keywords: ['prefeitura', 'obra'] },
          { channelName: 'Digital', keywords: ['prefeitura'] },
        ],
      },
      {
        customerName: 'Banco X',
        channels: [{ channelName: 'Impresso', keywords: ['juros'] }],
      },
    ])
  })

  it('merges keywords for the same customer and channel', () => {
    expect(
      groupClientMatches([
        { customerName: ' Acme Ltda ', channelName: 'Impresso', keywords: ['prefeitura', ''] },
        { customerName: 'acme ltda', channelName: 'impresso', keywords: ['Prefeitura', 'obra'] },
      ]),
    ).toEqual([
      {
        customerName: 'Acme Ltda',
        channels: [{ channelName: 'Impresso', keywords: ['prefeitura', 'obra'] }],
      },
    ])
  })
})

describe('resolveClientMatchGroups', () => {
  it('prefers structured matches when they exist', () => {
    expect(
      resolveClientMatchGroups({
        clientMatches: [
          { customerName: 'Acme Ltda', channelName: 'Impresso', keywords: ['obra'] },
        ],
        clientKeywords: ['ignored'],
        customerNames: ['ignored'],
      }),
    ).toEqual([
      {
        customerName: 'Acme Ltda',
        channels: [{ channelName: 'Impresso', keywords: ['obra'] }],
      },
    ])
  })

  it('falls back to customer names without pinning all keywords to the first one', () => {
    expect(
      resolveClientMatchGroups({
        clientMatches: [],
        clientKeywords: ['obra'],
        customerNames: ['Acme Ltda', 'Banco X'],
      }),
    ).toEqual([
      { customerName: 'Acme Ltda', channels: [] },
      { customerName: 'Banco X', channels: [] },
    ])
  })

  it('keeps the flat keyword list when there is a single customer name', () => {
    expect(
      resolveClientMatchGroups({
        clientMatches: [],
        clientKeywords: ['obra'],
        customerNames: ['Acme Ltda'],
      }),
    ).toEqual([
      {
        customerName: 'Acme Ltda',
        channels: [{ channelName: '', keywords: ['obra'] }],
      },
    ])
  })

  it('falls back to a generic client when only keywords exist', () => {
    expect(
      resolveClientMatchGroups({
        clientMatches: [],
        clientKeywords: ['obra'],
        customerNames: [],
      }),
    ).toEqual([
      {
        customerName: 'Cliente',
        channels: [{ channelName: '', keywords: ['obra'] }],
      },
    ])
  })
})
