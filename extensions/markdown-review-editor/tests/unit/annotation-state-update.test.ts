import { describe, it, expect, vi } from 'vitest';
import { applyAnswersToMarkdown } from '$lib/utils/annotation-state-update';

// Suppress deprecation warnings in tests
vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('annotation-state-update', () => {
	describe('applyAnswersToMarkdown (deprecated)', () => {
		it('should unwrap non-answered annotations when prompted', () => {
			const markdown = `
<x-annotation id="a-1">highlighted text<x-comment>Some question?</x-comment></x-annotation>
`;

			const answers = new Map<string, string>();
			const promptedIds = new Set(['a-1']);
			const result = applyAnswersToMarkdown(markdown, answers, promptedIds);

			expect(result).toContain('highlighted text');
			expect(result).not.toContain('<x-annotation');
			expect(result).not.toContain('x-comment');
		});

		it('should preserve non-prompted annotations (discussion-only)', () => {
			const markdown = `
<x-annotation id="a-1">highlighted text<x-comment><msg author="User">Old question?</msg><msg author="AI">Old answer</msg></x-comment></x-annotation>
`;

			const answers = new Map<string, string>();
			const promptedIds = new Set<string>(); // Not prompted - no new reply
			const result = applyAnswersToMarkdown(markdown, answers, promptedIds);

			// Should keep the annotation as-is
			expect(result).toContain('<x-annotation id="a-1">');
			expect(result).toContain('<x-comment>');
			expect(result).toContain('<msg author="User">Old question?</msg>');
			expect(result).toContain('<msg author="AI">Old answer</msg>');
		});

		it('should update answered annotations with discussion thread', () => {
			const markdown = `
<x-annotation id="a-1">highlighted text<x-comment>Should we add a filter?</x-comment></x-annotation>
`;

			const answers = new Map<string, string>();
			answers.set('a-1', 'Yes, a filter would be useful');
			const promptedIds = new Set(['a-1']);

			const result = applyAnswersToMarkdown(markdown, answers, promptedIds);

			expect(result).toContain('<x-annotation');
			expect(result).toContain('<x-comment>');
			expect(result).toContain('<msg author="User">Should we add a filter?</msg>');
			expect(result).toContain('<msg author="AI">Yes, a filter would be useful</msg>');
		});

		it('should preserve existing msg elements in discussion', () => {
			const markdown = `
<x-annotation id="a-1">text<x-comment><msg author="User">First question?</msg>Clarification needed</x-comment></x-annotation>
`;

			const answers = new Map<string, string>();
			answers.set('a-1', 'Here is the clarification');
			const promptedIds = new Set(['a-1']);

			const result = applyAnswersToMarkdown(markdown, answers, promptedIds);

			expect(result).toContain('<msg author="User">First question?</msg>');
			expect(result).toContain('<msg author="User">Clarification needed</msg>');
			expect(result).toContain('<msg author="AI">Here is the clarification</msg>');
		});

		it('should wrap editable content in msg author="User"', () => {
			const markdown = `
<x-annotation id="a-1">text<x-comment>This is the editable content</x-comment></x-annotation>
`;

			const answers = new Map<string, string>();
			answers.set('a-1', 'AI response');
			const promptedIds = new Set(['a-1']);

			const result = applyAnswersToMarkdown(markdown, answers, promptedIds);

			expect(result).toContain('<msg author="User">This is the editable content</msg>');
		});

		it('should append answer wrapped in msg author="AI"', () => {
			const markdown = `
<x-annotation id="a-1">text<x-comment>Question?</x-comment></x-annotation>
`;

			const answers = new Map<string, string>();
			answers.set('a-1', 'This is the AI answer');
			const promptedIds = new Set(['a-1']);

			const result = applyAnswersToMarkdown(markdown, answers, promptedIds);

			expect(result).toContain('<msg author="AI">This is the AI answer</msg>');
		});

		it('should handle annotations with no prior discussion', () => {
			const markdown = `
<x-annotation id="a-1">content<x-comment>Just a comment</x-comment></x-annotation>
`;

			const answers = new Map<string, string>();
			answers.set('a-1', 'Answer');
			const promptedIds = new Set(['a-1']);

			const result = applyAnswersToMarkdown(markdown, answers, promptedIds);

			const msgCount = (result.match(/<msg/g) || []).length;
			expect(msgCount).toBe(2); // User + AI
			expect(result).toContain('<msg author="User">Just a comment</msg>');
			expect(result).toContain('<msg author="AI">Answer</msg>');
		});

		it('should handle annotations with multiple prior discussion messages', () => {
			const markdown = `
<x-annotation id="a-1">text<x-comment><msg author="User">First message?</msg><msg author="Assistant">Response</msg>Follow-up question?</x-comment></x-annotation>
`;

			const answers = new Map<string, string>();
			answers.set('a-1', 'Final answer');
			const promptedIds = new Set(['a-1']);

			const result = applyAnswersToMarkdown(markdown, answers, promptedIds);

			expect(result).toContain('<msg author="User">First message?</msg>');
			expect(result).toContain('<msg author="Assistant">Response</msg>');
			expect(result).toContain('<msg author="User">Follow-up question?</msg>');
			expect(result).toContain('<msg author="AI">Final answer</msg>');
		});

		it('should preserve markdown formatting in content', () => {
			const markdown = `
<x-annotation id="a-1">**bold** and *italic*<x-comment>Format with **markdown**</x-comment></x-annotation>
`;

			const answers = new Map<string, string>();
			answers.set('a-1', 'Use **bold** for emphasis');
			const promptedIds = new Set(['a-1']);

			const result = applyAnswersToMarkdown(markdown, answers, promptedIds);

			expect(result).toContain('**bold**');
			expect(result).toContain('*italic*');
			expect(result).toContain('Format with **markdown**');
			expect(result).toContain('Use **bold** for emphasis');
		});

		it('should preserve annotation attributes', () => {
			const markdown = `
<x-annotation id="a-1" data-test="value">content<x-comment>comment</x-comment></x-annotation>
`;

			const answers = new Map<string, string>();
			answers.set('a-1', 'answer');
			const promptedIds = new Set(['a-1']);

			const result = applyAnswersToMarkdown(markdown, answers, promptedIds);

			expect(result).toContain('id="a-1"');
			expect(result).toContain('data-test="value"');
		});

		it('should handle mixed answered and non-answered annotations', () => {
			const markdown = `First annotation: <x-annotation id="a-1">text1<x-comment>no answer</x-comment></x-annotation>

Second annotation: <x-annotation id="a-2">text2<x-comment>has answer</x-comment></x-annotation>`;

			const answers = new Map<string, string>();
			answers.set('a-2', 'Answer for a-2');
			const promptedIds = new Set(['a-1', 'a-2']); // Both were prompted

			const result = applyAnswersToMarkdown(markdown, answers, promptedIds);

			expect(result).toContain('text1'); // unwrapped
			expect(result).not.toContain('x-annotation id="a-1"');
			expect(result).toContain('<x-annotation id="a-2"'); // kept
			expect(result).toContain('<msg author="AI">Answer for a-2</msg>');
		});

		it('should handle empty editable content', () => {
			const markdown = `
<x-annotation id="a-1">text<x-comment><msg author="Prior">message</msg></x-comment></x-annotation>
`;

			const answers = new Map<string, string>();
			answers.set('a-1', 'Answer');
			const promptedIds = new Set(['a-1']);

			const result = applyAnswersToMarkdown(markdown, answers, promptedIds);

			// Should create empty msg for User if no editable content
			expect(result).toContain('<msg author="User"></msg>');
			expect(result).toContain('<msg author="AI">Answer</msg>');
		});

		it('should handle multiple annotations in one document', () => {
			const markdown = `
Some text before.

<x-annotation id="a-1">content1<x-comment>Q1?</x-comment></x-annotation>

Middle text.

<x-annotation id="a-2">content2<x-comment>Q2?</x-comment></x-annotation>

End text.
`;

			const answers = new Map<string, string>();
			answers.set('a-1', 'Answer1');
			const promptedIds = new Set(['a-1', 'a-2']); // Both were prompted

			const result = applyAnswersToMarkdown(markdown, answers, promptedIds);

			// a-1 should be answered
			expect(result).toContain('<x-annotation id="a-1"');
			expect(result).toContain('<msg author="AI">Answer1</msg>');

			// a-2 should be unwrapped (was prompted but no answer)
			expect(result).toContain('content2');
			expect(result).not.toContain('<x-annotation id="a-2"');
		});

		it('should preserve document structure around annotations', () => {
			const markdown = `# Title

Paragraph before.

<x-annotation id="a-1">highlighted<x-comment>comment</x-comment></x-annotation>

Paragraph after.

- List item 1
- List item 2`;

			const answers = new Map<string, string>();
			answers.set('a-1', 'Answer');
			const promptedIds = new Set(['a-1']);

			const result = applyAnswersToMarkdown(markdown, answers, promptedIds);

			expect(result).toContain('# Title');
			expect(result).toContain('Paragraph before.');
			expect(result).toContain('Paragraph after.');
			expect(result).toContain('- List item 1');
			expect(result).toContain('- List item 2');
		});

		it('should handle answers with special characters and escaping', () => {
			const markdown = `
<x-annotation id="a-1">text<x-comment>question</x-comment></x-annotation>
`;

			const answers = new Map<string, string>();
			answers.set('a-1', 'Answer with <angle> brackets & "quotes"');
			const promptedIds = new Set(['a-1']);

			const result = applyAnswersToMarkdown(markdown, answers, promptedIds);

			expect(result).toContain('Answer with <angle> brackets & "quotes"');
		});

		it('should handle no answers provided when prompted', () => {
			const markdown = `
<x-annotation id="a-1">content<x-comment>comment</x-comment></x-annotation>
`;

			const answers = new Map<string, string>();
			const promptedIds = new Set(['a-1']);
			const result = applyAnswersToMarkdown(markdown, answers, promptedIds);

			expect(result).toContain('content');
			expect(result).not.toContain('<x-annotation');
		});

		it('should maintain order: existing msg, user message, AI answer', () => {
			const markdown = `
<x-annotation id="a-1">text<x-comment><msg author="User">Old message</msg>New question</x-comment></x-annotation>
`;

			const answers = new Map<string, string>();
			answers.set('a-1', 'New answer');
			const promptedIds = new Set(['a-1']);

			const result = applyAnswersToMarkdown(markdown, answers, promptedIds);

			const oldMsgIndex = result.indexOf('<msg author="User">Old message</msg>');
			const newMsgIndex = result.indexOf('<msg author="User">New question</msg>');
			const aiIndex = result.indexOf('<msg author="AI">New answer</msg>');

			expect(oldMsgIndex).toBeLessThan(newMsgIndex);
			expect(newMsgIndex).toBeLessThan(aiIndex);
		});
	});
});
