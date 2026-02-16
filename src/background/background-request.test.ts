import * as s from 'superstruct';
import { describe, expect, it } from 'vitest';

import { BackgroundRequestSchema } from './background-request';

// =========================================================================
// Anki message schema validation
// =========================================================================

describe('BackgroundRequestSchema — Anki messages', () => {
  // -----------------------------------------------------------------------
  // ankiTestConnection
  // -----------------------------------------------------------------------

  describe('ankiTestConnection', () => {
    it('accepts a valid message', () => {
      const msg = { type: 'ankiTestConnection' };
      expect(() => s.assert(msg, BackgroundRequestSchema)).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // ankiGetDecks
  // -----------------------------------------------------------------------

  describe('ankiGetDecks', () => {
    it('accepts a valid message', () => {
      const msg = { type: 'ankiGetDecks' };
      expect(() => s.assert(msg, BackgroundRequestSchema)).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // ankiGetNoteTypes
  // -----------------------------------------------------------------------

  describe('ankiGetNoteTypes', () => {
    it('accepts a valid message', () => {
      const msg = { type: 'ankiGetNoteTypes' };
      expect(() => s.assert(msg, BackgroundRequestSchema)).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // ankiGetModelFields
  // -----------------------------------------------------------------------

  describe('ankiGetModelFields', () => {
    it('accepts a valid message', () => {
      const msg = { type: 'ankiGetModelFields', model: 'Basic' };
      expect(() => s.assert(msg, BackgroundRequestSchema)).not.toThrow();
    });

    it('rejects when model is missing', () => {
      const msg = { type: 'ankiGetModelFields' };
      expect(() => s.assert(msg, BackgroundRequestSchema)).toThrow();
    });

    it('rejects when model is not a string', () => {
      const msg = { type: 'ankiGetModelFields', model: 123 };
      expect(() => s.assert(msg, BackgroundRequestSchema)).toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // ankiAddNote
  // -----------------------------------------------------------------------

  describe('ankiAddNote', () => {
    it('accepts a valid message', () => {
      const msg = {
        type: 'ankiAddNote',
        deckName: 'Default',
        modelName: 'Basic',
        fields: { Front: '食べる', Back: 'to eat' },
      };
      expect(() => s.assert(msg, BackgroundRequestSchema)).not.toThrow();
    });

    it('rejects when deckName is missing', () => {
      const msg = {
        type: 'ankiAddNote',
        modelName: 'Basic',
        fields: { Front: '食べる' },
      };
      expect(() => s.assert(msg, BackgroundRequestSchema)).toThrow();
    });

    it('rejects when modelName is missing', () => {
      const msg = {
        type: 'ankiAddNote',
        deckName: 'Default',
        fields: { Front: '食べる' },
      };
      expect(() => s.assert(msg, BackgroundRequestSchema)).toThrow();
    });

    it('rejects when fields is missing', () => {
      const msg = {
        type: 'ankiAddNote',
        deckName: 'Default',
        modelName: 'Basic',
      };
      expect(() => s.assert(msg, BackgroundRequestSchema)).toThrow();
    });

    it('rejects when fields has non-string values', () => {
      const msg = {
        type: 'ankiAddNote',
        deckName: 'Default',
        modelName: 'Basic',
        fields: { Front: 123 },
      };
      expect(() => s.assert(msg, BackgroundRequestSchema)).toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // ankiFindNote
  // -----------------------------------------------------------------------

  describe('ankiFindNote', () => {
    it('accepts a valid message', () => {
      const msg = {
        type: 'ankiFindNote',
        deckName: 'Japanese',
        expression: '食べる',
        reading: 'たべる',
      };
      expect(() => s.assert(msg, BackgroundRequestSchema)).not.toThrow();
    });

    it('rejects when expression is missing', () => {
      const msg = {
        type: 'ankiFindNote',
        deckName: 'Japanese',
        reading: 'たべる',
      };
      expect(() => s.assert(msg, BackgroundRequestSchema)).toThrow();
    });

    it('rejects when reading is missing', () => {
      const msg = {
        type: 'ankiFindNote',
        deckName: 'Japanese',
        expression: '食べる',
      };
      expect(() => s.assert(msg, BackgroundRequestSchema)).toThrow();
    });

    it('rejects when deckName is missing', () => {
      const msg = {
        type: 'ankiFindNote',
        expression: '食べる',
        reading: 'たべる',
      };
      expect(() => s.assert(msg, BackgroundRequestSchema)).toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // ankiOpenNote
  // -----------------------------------------------------------------------

  describe('ankiOpenNote', () => {
    it('accepts a valid message', () => {
      const msg = { type: 'ankiOpenNote', noteId: 12345 };
      expect(() => s.assert(msg, BackgroundRequestSchema)).not.toThrow();
    });

    it('rejects when noteId is missing', () => {
      const msg = { type: 'ankiOpenNote' };
      expect(() => s.assert(msg, BackgroundRequestSchema)).toThrow();
    });

    it('rejects when noteId is a string', () => {
      const msg = { type: 'ankiOpenNote', noteId: '12345' };
      expect(() => s.assert(msg, BackgroundRequestSchema)).toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Invalid Anki type
  // -----------------------------------------------------------------------

  describe('unknown message type', () => {
    it('rejects an unknown anki message type', () => {
      const msg = { type: 'ankiDeleteNote', noteId: 123 };
      expect(() => s.assert(msg, BackgroundRequestSchema)).toThrow();
    });
  });
});
