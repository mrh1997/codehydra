/**
 * @deprecated This module is deprecated.
 * Annotation state updates are now handled directly by HtmlAnnotator.setAnnotation().
 *
 * The old applyAnswersToMarkdown function is kept for reference only.
 */

/**
 * Extract msg elements from comment content as array of full tag strings.
 * @deprecated Use HtmlAnnotator's parseMessages instead
 */
function extractMsgElements(commentContent: string): string[] {
	const msgRegex = /<msg\s+author="([^"]*)"\s*>([\s\S]*?)<\/msg>/g;
	const elements: string[] = [];

	let match;
	while ((match = msgRegex.exec(commentContent)) !== null) {
		elements.push(match[0]); // Push full tag
	}

	return elements;
}

/**
 * Extract editable content from comment (text NOT in msg tags).
 * @deprecated Use HtmlAnnotator's getEditableContent instead
 */
function extractEditableContent(commentContent: string): string {
	// Remove all msg elements
	const contentWithoutMsg = commentContent
		.replace(/<msg\s+author="[^"]*"\s*>[\s\S]*?<\/msg>/g, '')
		.trim();

	return contentWithoutMsg;
}

/**
 * @deprecated Use HtmlAnnotator.setAnnotation() instead.
 *
 * This function is kept for reference. With the new architecture:
 * 1. HtmlAnnotator stores annotation states separately from document
 * 2. setAnnotation(id, content) updates the messages for an annotation
 * 3. setDocument(html) updates the document, preserving annotation states
 */
export function applyAnswersToMarkdown(
	markdown: string,
	answers: Map<string, string>,
	promptedIds: Set<string>
): string {
	console.warn('applyAnswersToMarkdown is deprecated. Use HtmlAnnotator.setAnnotation() instead.');

	// Regex to match x-annotation tags with named capture groups:
	// 1. Annotation attributes (including id)
	// 2. Annotation ID value
	// 3. Content inside annotation (highlighted text, before x-comment)
	// 4. x-comment content
	const annotationRegex =
		/<x-annotation([^>]*id="([^"]+)"[^>]*)>([\s\S]*?)<x-comment>([\s\S]*?)<\/x-comment><\/x-annotation>/g;

	return markdown.replace(annotationRegex, (fullMatch, attrs, id, content, commentContent) => {
		const answer = answers.get(id);

		if (!answer) {
			// Only unwrap if this annotation had a prompt sent
			// Discussion-only annotations (no new reply) should be preserved
			if (promptedIds.has(id)) {
				return content; // Unwrap - instruction was processed
			}
			return fullMatch; // Keep as-is - no prompt was sent
		}

		// Has answer: rebuild annotation with updated discussion thread
		const existingMsgElements = extractMsgElements(commentContent);
		const editableContent = extractEditableContent(commentContent);

		// Build new x-comment with:
		// - Existing msg elements (preserved from prior discussion)
		// - New msg for user's editable content
		// - New msg for AI's answer
		const newMsgElements = [
			...existingMsgElements,
			`<msg author="User">${editableContent}</msg>`,
			`<msg author="AI">${answer}</msg>`
		].join('');

		const newComment = `<x-comment>${newMsgElements}</x-comment>`;

		return `<x-annotation${attrs}>${content}${newComment}</x-annotation>`;
	});
}
