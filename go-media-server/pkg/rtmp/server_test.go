package rtmp

import "testing"

// extractStreamKey is an unexported function — tested in the same package.

func TestExtractStreamKey(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		// Raw key — no slashes
		{"raw key", "abc123", "abc123"},
		{"UUID key", "550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440000"},

		// /live/<key> — standard OBS publish path
		{"live prefix", "/live/mykey", "mykey"},
		{"live prefix no slash", "live/mykey", "mykey"},

		// Nested path — returns last segment
		{"nested path", "/app/sub/key123", "key123"},

		// Root slash only key
		{"leading slash only", "/justkey", "justkey"},

		// Empty
		{"empty string", "", ""},

		// Just slashes
		{"just slash", "/", ""},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := extractStreamKey(tc.input)
			if got != tc.expected {
				t.Errorf("extractStreamKey(%q) = %q, want %q", tc.input, got, tc.expected)
			}
		})
	}
}
