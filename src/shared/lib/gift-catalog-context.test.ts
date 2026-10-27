import { describe, expect, it } from 'vitest';
import {
  buildGiftCatalogCreateRequest,
  buildGiftCatalogUpdateRequest,
  giftCatalogFormError,
  GIFT_CONTEXT_PRESENTATION,
  type GiftCatalogFormData,
} from './gift-catalog-context';

const baseForm: GiftCatalogFormData = {
  contextType: 'room',
  code: 'rose',
  name: 'Rose',
  description: '',
  iconMediaId: '',
  previewMediaId: '',
  animationMediaId: '',
  soundMediaId: '',
  stickerMediaId: '',
  metadataJson: '',
  allowedGameTypes: [],
  priceGameCurrency: '250',
  category: 'basic',
  rarity: 'common',
  visualType: 'static',
  popularityPoints: 2,
  wealthPoints: 3,
  charmPoints: 4,
  reputationPoints: 5,
  roomContributionPoints: 6,
  roomExperiencePoints: 7,
  senderExperiencePoints: 8,
  receiverExperiencePoints: 9,
  broadcastLevel: 'room',
  displayPriority: 0,
  isActive: true,
  isLimitedTime: false,
  startsAt: '',
  endsAt: '',
  countryCode: '',
  roomId: 'room-1',
  vipLevelRequired: 0,
  eventId: '',
};

describe('gift catalog context separation', () => {
  it('GIFT-001 presents and preserves room gift semantics', () => {
    const payload = buildGiftCatalogCreateRequest(baseForm);

    expect(GIFT_CONTEXT_PRESENTATION.room.label).toBe('Room gift');
    expect(payload.contextType).toBe('room');
    expect(payload.roomContributionPoints).toBe(6);
    expect(payload.broadcastLevel).toBe('room');
    expect(payload.roomId).toBe('room-1');
  });

  it('GIFT-002 presents and builds a match-only gift', () => {
    const payload = buildGiftCatalogCreateRequest({
      ...baseForm,
      contextType: 'match',
      stickerMediaId: 'media:match-sticker',
      allowedGameTypes: ['ludo'],
    });

    expect(GIFT_CONTEXT_PRESENTATION.match.label).toBe('Match gift');
    expect(payload.contextType).toBe('match');
    expect(payload.stickerMediaId).toBe('media:match-sticker');
    expect(payload.allowedGameTypes).toEqual(['ludo']);
  });

  /**
   * The backend persists every one of these on a match gift: a match row was
   * created with all five point fields non-zero, `broadcastLevel: "zone"`,
   * `allowedGameTypes: ["ludo"]` and a `roomId`, and a follow-up
   * `PATCH { contextType: "room" }` left all of them intact. The builder must
   * therefore send exactly what the operator has, or a save silently zeroes
   * stored data.
   */
  it('GIFT-003 preserves stored point, broadcast and room values on a match gift', () => {
    const payload = buildGiftCatalogCreateRequest({
      ...baseForm,
      contextType: 'match',
      stickerMediaId: 'media:match-sticker',
      broadcastLevel: 'global',
    });

    expect(payload.roomContributionPoints).toBe(6);
    expect(payload.roomExperiencePoints).toBe(7);
    expect(payload.senderExperiencePoints).toBe(8);
    expect(payload.receiverExperiencePoints).toBe(9);
    expect(payload.broadcastLevel).toBe('global');
    expect(payload.roomId).toBe('room-1');
  });

  /**
   * `stickerMediaId` is a send-time requirement in
   * `GiftAvailabilityService.validateForSend`, not a persistence requirement:
   * a match gift was created without one. It must not block a save.
   */
  it('accepts a match gift with no sticker media', () => {
    expect(giftCatalogFormError({ ...baseForm, contextType: 'match' })).toBeNull();
  });

  it('carries the animation, preview and sound media references', () => {
    const payload = buildGiftCatalogUpdateRequest({
      ...baseForm,
      visualType: 'animated',
      iconMediaId: 'media:icon',
      previewMediaId: 'media:preview',
      animationMediaId: 'media:animation',
      soundMediaId: 'media:sound',
      metadataJson: '{"note":"keep","nested":{"k":1}}',
    });

    expect(payload.iconMediaId).toBe('media:icon');
    expect(payload.previewMediaId).toBe('media:preview');
    expect(payload.animationMediaId).toBe('media:animation');
    expect(payload.soundMediaId).toBe('media:sound');
    expect(payload.metadata).toEqual({ note: 'keep', nested: { k: 1 } });
  });

  it('sends an emptied media field as an empty string so the update clears the column', () => {
    const payload = buildGiftCatalogUpdateRequest({
      ...baseForm,
      iconMediaId: '',
      previewMediaId: '',
      animationMediaId: '',
      soundMediaId: '',
      metadataJson: '',
    });

    expect(payload.iconMediaId).toBe('');
    expect(payload.previewMediaId).toBe('');
    expect(payload.animationMediaId).toBe('');
    expect(payload.soundMediaId).toBe('');
    expect(payload.metadata).toBeNull();
  });

  it('reports a validation reason instead of throwing from the request builder', () => {
    expect(giftCatalogFormError({ ...baseForm, code: '  ' })).toBe('Gift slug is required');
    expect(giftCatalogFormError({ ...baseForm, name: '' })).toBe('Gift name is required');
    expect(giftCatalogFormError({ ...baseForm, priceGameCurrency: '1500.5' }))
      .toBe('Gift price must be a positive integer GAME_CURRENCY value');
    expect(giftCatalogFormError({ ...baseForm, metadataJson: 'nope' }))
      .toBe('Metadata must be a JSON object');
    expect(giftCatalogFormError({ ...baseForm, metadataJson: '[1,2]' }))
      .toBe('Metadata must be a JSON object');
    expect(giftCatalogFormError(baseForm)).toBeNull();
  });
});