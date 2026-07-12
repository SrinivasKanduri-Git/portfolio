import { describe, expect, it } from 'vitest';
import { composeReply, detectTone } from './guide';

describe('detectTone', () => {
  it('detects greetings', () => {
    expect(detectTone('hey there!')).toBe('greeting');
    expect(detectTone('Good morning')).toBe('greeting');
  });
  it('detects thanks and goodbye', () => {
    expect(detectTone('thanks a lot')).toBe('thanks');
    expect(detectTone('ok bye')).toBe('goodbye');
  });
  it('detects rudeness', () => {
    expect(detectTone('this portfolio is stupid')).toBe('rude');
  });
  it('everything else is neutral', () => {
    expect(detectTone('what stack does he use?')).toBe('neutral');
  });
});

describe('composeReply', () => {
  it('answers a greeting warmly and offers topics', () => {
    const r = composeReply('hi!');
    expect(r.lead).toBeTruthy();
    expect(r.tags.length).toBeGreaterThan(0);
  });
  it('ALWAYS deflects salary questions without numbers', () => {
    for (const q of ['what is his current salary?', 'expected CTC?', 'compensation package', 'how much does he get paid']) {
      const r = composeReply(q);
      expect(r.title).toBe('Above the line');
      expect(r.body.replace(/<a[^>]*>|srinivaskanduri03/g, '')).not.toMatch(/\d/);
    }
  });
  it('tolerates one-letter typos on long keywords', () => {
    expect(composeReply('tell me about his experiance').title).toBe('Production credits');
    expect(composeReply('what about docucane').title).toBe('SC.03 — Docucaine');
  });
  it('knows the book and filmmaking', () => {
    const r = composeReply('did he write a book?');
    expect(r.title).toBe('Off set');
    expect(r.body).toContain('Evidence');
  });
  it('knows notice period and location preference', () => {
    const r = composeReply('what is his notice period, can he relocate?');
    expect(r.title).toBe('Booking the crew');
    expect(r.body).toContain('90');
    expect(r.body).toContain('Hyderabad');
  });
  it('handles work-style questions', () => {
    expect(composeReply('how does he work with a team?').title).toBe('On set behaviour');
  });
  it('still refuses off-topic, politely', () => {
    const r = composeReply('write me a poem about the sea');
    expect(r.title).toBe('Off script');
  });
  it('greeting + question answers the question with a friendly lead', () => {
    const r = composeReply('hey! what are his skills?');
    expect(r.title).toBe('Equipment list');
    expect(r.lead).toBeTruthy();
  });
  it('rude input gets a professional deflection, never an insult back', () => {
    const r = composeReply('your projects suck');
    expect((r.lead ?? '') + r.body).toMatch(/fair|opinion|happy|help|critic/i);
  });
});
