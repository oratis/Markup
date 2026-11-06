(function() {
	function c(i) {
		const e = i?.trim();
		return !(!e || /^#{1,6}\s/.test(e) || /^[-*+]\s/.test(e) || /^\d+[.)]\s/.test(e));
	}
	function m(i) {
		const e = [], s = i.split(`
`);
		let n = !1, o = "", r = 0;
		if (s[0]?.trim() === "---") {
			for (let t = 1; t < s.length; t++) if (s[t]?.trim() === "---") {
				r = t + 1;
				break;
			}
		}
		for (let t = r; t < s.length; t++) {
			const l = s[t], f = l.trimStart(), u = f.match(/^(```|~~~)/);
			if (u) {
				n ? f.startsWith(o) && (n = !1) : (n = !0, o = u[1]);
				continue;
			}
			if (n) continue;
			const a = f.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
			if (a) {
				e.push({
					level: a[1].length,
					text: a[2],
					line: t
				});
				continue;
			}
			if (t > r && /^=+\s*$/.test(l.trim()) && c(s[t - 1])) {
				e.push({
					level: 1,
					text: s[t - 1].trim(),
					line: t - 1
				});
				continue;
			}
			t > r && /^-+\s*$/.test(l.trim()) && c(s[t - 1]) && e.push({
				level: 2,
				text: s[t - 1].trim(),
				line: t - 1
			});
		}
		return e;
	}
	self.onmessage = (i) => {
		const { id: e, text: s } = i.data, n = {
			id: e,
			headings: m(s)
		};
		self.postMessage(n);
	};
})();
