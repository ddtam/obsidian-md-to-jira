import { ImageEmbedStyle } from '../settings';

export function renderImageMarkup(src: string, alt: string, style: ImageEmbedStyle): string {
    switch (style) {
        case 'thumbnail':
            return `!${src}|thumbnail!`;
        case 'plain':
            return `!${src}!`;
        case 'alt':
        default:
            return `!${src}|alt=${alt}!`;
    }
}

export function renderWarningPanel(src: string): string {
    return `{panel:borderColor=#ffecb5|bgColor=#fff3cd}
{color:#664d03}+*Warning:*+ The following file must be transferred manually via drag & drop: *${src}*{color}
{panel}
`;
}
