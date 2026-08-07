// Manual mock for ImageHandler, picked up by `jest.mock('../services/ImageHandler')`.
//
// Lives here rather than inline in a single test file so that the golden
// fixtures and the unit tests share one deterministic image rendering — a
// fixture containing an image would otherwise depend on whichever mock the
// importing test file happened to define.

export const ImageHandler = jest.fn().mockImplementation(() => {
	return {
		handleImage: jest
			.fn()
			.mockImplementation(async (src: string, alt: string) => {
				const isUrlOrBase64 =
					src.startsWith('http://') ||
					src.startsWith('https://') ||
					src.startsWith('data:image/');

				if (isUrlOrBase64) {
					return {
						jiraMarkup: `!${src}|alt=${alt}!`,
						success: true,
					};
				}

				return {
					jiraMarkup: `{panel:borderColor=#ffecb5|bgColor=#fff3cd}
{color:#664d03}+*Warning:*+ The following file must be transferred manually via drag & drop: *${src}*{color}
{panel}

!${src}|alt=${alt}!`,
					success: true,
				};
			}),
	};
});
