function loadShadowForPlatform(os) {
	jest.resetModules();
	jest.doMock('react-native', () => ({
		Platform: {
			OS: os,
			select: (map) => map[os] || map.default,
		},
	}));
	return require('../shadow');
}

describe('shadow utility', () => {
	test('uses boxShadow on web', () => {
		const { shadow } = loadShadowForPlatform('web');
		const style = shadow(2);
		expect(style.boxShadow).toContain('0px 2px 4px');
	});

	test('uses iOS legacy shadow props on ios', () => {
		const { shadow } = loadShadowForPlatform('ios');
		const style = shadow(3, { color: '#111111', opacity: 0.22 });
		expect(style).toEqual({
			shadowColor: '#111111',
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.22,
			shadowRadius: 8,
		});
	});

	test('uses elevation on android', () => {
		const { shadow } = loadShadowForPlatform('android');
		const style = shadow(4);
		expect(style.elevation).toBe(8);
		expect(style.shadowColor).toBe('#000');
	});

	test('modernShadow returns boxShadow style', () => {
		const { modernShadow } = loadShadowForPlatform('android');
		const style = modernShadow(1);
		expect(style).toEqual({
			boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.10)',
		});
	});
});