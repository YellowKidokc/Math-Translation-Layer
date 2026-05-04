export interface ExtractedMathBlock {
    latex: string;
    start: number;
    end: number;
    isBlock: boolean;
}

function pushMatches(
    blocks: ExtractedMathBlock[],
    regex: RegExp,
    content: string,
    groupIndex: number,
    isBlock: boolean
): void {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
        blocks.push({
            latex: match[groupIndex].trim(),
            start: match.index,
            end: match.index + match[0].length,
            isBlock
        });
    }
}

export function extractMathBlocks(content: string): ExtractedMathBlock[] {
    const blocks: ExtractedMathBlock[] = [];

    pushMatches(blocks, /\$\$([\s\S]+?)\$\$/g, content, 1, true);
    pushMatches(blocks, /(?<!\$)\$([^\$\n]+?)\$(?!\$)/g, content, 1, false);
    pushMatches(blocks, /\\\((.+?)\\\)/g, content, 1, false);
    pushMatches(blocks, /\\\[(.+?)\\\]/gs, content, 1, true);
    pushMatches(
        blocks,
        /<div[^>]*class=["'][^"']*math[^"']*["'][^>]*>\s*(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$]+\$|\\\(.+?\\\))\s*<\/div>/gi,
        content,
        1,
        true
    );

    return blocks.sort((left, right) => left.start - right.start);
}
