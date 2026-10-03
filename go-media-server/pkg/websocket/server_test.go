package websocket

import (
	"encoding/binary"
	"testing"
)

// makeFLVTag and makeFLVHeader are unexported — tested in the same package.

func TestMakeFLVHeader(t *testing.T) {
	hdr := makeFLVHeader()

	// FLV signature
	if hdr[0] != 'F' || hdr[1] != 'L' || hdr[2] != 'V' {
		t.Errorf("FLV header signature: got %q, want \"FLV\"", hdr[:3])
	}
	// Version
	if hdr[3] != 0x01 {
		t.Errorf("FLV version: got 0x%02x, want 0x01", hdr[3])
	}
	// Flags: audio+video = 0x05
	if hdr[4] != 0x05 {
		t.Errorf("FLV flags: got 0x%02x, want 0x05 (audio+video)", hdr[4])
	}
	// DataOffset = 9 (big-endian uint32)
	offset := binary.BigEndian.Uint32(hdr[5:9])
	if offset != 9 {
		t.Errorf("FLV data offset: got %d, want 9", offset)
	}
	// PreviousTagSize0 = 0
	pts0 := binary.BigEndian.Uint32(hdr[9:13])
	if pts0 != 0 {
		t.Errorf("PreviousTagSize0: got %d, want 0", pts0)
	}
	// Total length = 13
	if len(hdr) != 13 {
		t.Errorf("FLV header length: got %d, want 13", len(hdr))
	}
}

func TestMakeFLVTagAudio(t *testing.T) {
	payload := []byte{0xAF, 0x01, 0xDE, 0xAD, 0xBE, 0xEF}
	const ts = uint32(1234)

	tag := makeFLVTag(8, ts, payload)

	// Tag type
	if tag[0] != 8 {
		t.Errorf("tag type: got %d, want 8 (audio)", tag[0])
	}

	// DataSize = len(payload) = 6
	dataSize := uint32(tag[1])<<16 | uint32(tag[2])<<8 | uint32(tag[3])
	if dataSize != uint32(len(payload)) {
		t.Errorf("DataSize: got %d, want %d", dataSize, len(payload))
	}

	// Timestamp: lower 24 bits at [4:7], upper 8 bits at [7]
	tsLower := uint32(tag[4])<<16 | uint32(tag[5])<<8 | uint32(tag[6])
	tsUpper := uint32(tag[7])
	reconstructed := (tsUpper << 24) | tsLower
	if reconstructed != ts {
		t.Errorf("Timestamp: got %d, want %d", reconstructed, ts)
	}

	// StreamID = 0 (3 bytes at [8:11])
	streamID := uint32(tag[8])<<16 | uint32(tag[9])<<8 | uint32(tag[10])
	if streamID != 0 {
		t.Errorf("StreamID: got %d, want 0", streamID)
	}

	// Payload bytes match
	for i, b := range payload {
		if tag[11+i] != b {
			t.Errorf("payload[%d]: got 0x%02x, want 0x%02x", i, tag[11+i], b)
		}
	}

	// PreviousTagSize = 11 + dataSize
	prevTagSize := binary.BigEndian.Uint32(tag[len(tag)-4:])
	if prevTagSize != 11+dataSize {
		t.Errorf("PreviousTagSize: got %d, want %d", prevTagSize, 11+dataSize)
	}

	// Total length
	expected := 11 + len(payload) + 4
	if len(tag) != expected {
		t.Errorf("tag length: got %d, want %d", len(tag), expected)
	}
}

func TestMakeFLVTagVideo(t *testing.T) {
	payload := []byte{0x17, 0x01, 0x00, 0x00, 0x00}
	tag := makeFLVTag(9, 0, payload)
	if tag[0] != 9 {
		t.Errorf("video tag type: got %d, want 9", tag[0])
	}
}

func TestMakeFLVTagTimestampExtended(t *testing.T) {
	// ts > 0xFFFFFF requires the extended byte
	const ts = uint32(0x01AABBCC)
	tag := makeFLVTag(9, ts, []byte{0x00})

	tsLower := uint32(tag[4])<<16 | uint32(tag[5])<<8 | uint32(tag[6])
	tsUpper := uint32(tag[7])
	reconstructed := (tsUpper << 24) | tsLower
	if reconstructed != ts {
		t.Errorf("extended timestamp: got %d, want %d", reconstructed, ts)
	}
}

func TestMakeFLVTagEmptyPayload(t *testing.T) {
	tag := makeFLVTag(8, 0, []byte{})
	if len(tag) != 15 { // 11 header + 0 data + 4 PTS
		t.Errorf("empty payload tag length: got %d, want 15", len(tag))
	}
	dataSize := uint32(tag[1])<<16 | uint32(tag[2])<<8 | uint32(tag[3])
	if dataSize != 0 {
		t.Errorf("empty payload DataSize: got %d, want 0", dataSize)
	}
}
