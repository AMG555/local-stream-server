package srt

import "testing"

// extractSRTKey is unexported — tested in the same package.

func TestExtractSRTKey(t *testing.T) {
	tests := []struct {
		name     string
		streamID string
		expected string
	}{
		// --- Raw UUID / raw key (FFmpeg default) ---
		{"raw uuid", "550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440000"},
		{"raw alphanumeric key", "myStreamKey123", "myStreamKey123"},

		// --- key=value format (OBS SRT extension) ---
		{"key= format", "key=abc123", "abc123"},
		{"stream_key= format", "stream_key=abc123", "abc123"},
		{"streamkey= format", "streamkey=abc123", "abc123"},
		{"key= with extra params", "key=abc123&bitrate=5000", "abc123"},

		// --- SRT Access Control format (#!::) ---
		{"srt ac r=live/key", "#!::r=live/myStreamKey", "myStreamKey"},
		{"srt ac r=key only", "#!::r=myStreamKey", "myStreamKey"},
		{"srt ac with extra fields", "#!::h=hostname,r=live/mykey,m=publish", "mykey"},
		{"srt ac uuid", "#!::r=live/550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440000"},

		// --- Edge cases ---
		{"empty string", "", ""},
		{"whitespace only", "   ", ""},
		{"hash without r field", "#!::h=host,m=publish", ""},
		{"key= empty value", "key=", ""},

		// --- Spaces trimmed ---
		{"leading/trailing whitespace", "  key=abc123  ", "abc123"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := extractSRTKey(tc.streamID)
			if got != tc.expected {
				t.Errorf("extractSRTKey(%q) = %q, want %q", tc.streamID, got, tc.expected)
			}
		})
	}
}
