package webrtc

// aactranscoder.go — AAC raw frame → Opus packet transcoder using FFmpeg.
//
// Each WebRTC peer gets its own FFmpeg subprocess:
//
//	stdin:  raw AAC-LC frames (no ADTS header, bare ES) preceded by a 4-byte
//	        big-endian length so FFmpeg's rawvideo/aac demuxer can frame them.
//	        We use the aac demuxer with -f aac which expects ADTS-wrapped frames,
//	        so we prepend a 7-byte ADTS header to each raw frame before writing.
//
//	stdout: Opus packets in Ogg container (libopus encoder).
//	        We parse the Ogg stream to extract individual Opus packets.
//
// FFmpeg command:
//
//	ffmpeg -f aac -i pipe:0 -c:a libopus -b:a 96k -ar 48000 -ac 2 -f ogg pipe:1
//
// Opus requires 48 kHz; FFmpeg resamples from 44100 automatically.
// Ogg framing gives us self-delimiting Opus packets we can read packet-by-packet.

import (
	"bufio"
	"io"
	"log"
	"os"
	"os/exec"
	"sync"
)

const (
	opusSampleRate = 48000
)

// adtsSampFreqTable maps MPEG-4 sampling_frequency_index to Hz.
// Index 4 = 44100 Hz, Index 3 = 48000 Hz (ISO 14496-3 Table 1.21).
var adtsSampFreqTable = []int{96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350}

// aacTranscoder pipes raw AAC frames into FFmpeg and emits Opus packets.
type aacTranscoder struct {
	cmd          *exec.Cmd
	stdin        io.WriteCloser
	mu           sync.Mutex // serialises writes to stdin
	closed       bool
	sampleRateHz int // input AAC sample rate (for ADTS header)
}

// newAACTranscoder starts an FFmpeg process for AAC→Opus transcoding.
// ffmpegPath is the path to the ffmpeg binary (e.g. "ffmpeg" or absolute path).
// sampleRateHz is the input sample rate (from AudioSpecificConfig); 44100 if unknown.
// onPacket is called for each Opus packet produced; it runs on a goroutine
// owned by the transcoder — callers must not block inside it.
func newAACTranscoder(ffmpegPath string, sampleRateHz int, onPacket func([]byte)) (*aacTranscoder, error) {
	if sampleRateHz <= 0 {
		sampleRateHz = 44100
	}
	cmd := exec.Command(ffmpegPath,
		"-hide_banner", "-loglevel", "error",
		"-f", "aac",      // input: ADTS-framed AAC on stdin
		"-i", "pipe:0",
		"-c:a", "libopus",
		"-b:a", "96k",
		"-ar", "48000",   // Opus always resamples to 48 kHz
		"-ac", "2",
		"-f", "ogg",      // output: Ogg container on stdout
		"pipe:1",
	)

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		stdin.Close()
		return nil, err
	}

	// Discard stderr (already loglevel=error, but keep it from blocking)
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		stdin.Close()
		return nil, err
	}

	t := &aacTranscoder{cmd: cmd, stdin: stdin, sampleRateHz: sampleRateHz}

	// Parse Ogg stream on stdout and emit Opus packets.
	go func() {
		defer cmd.Wait()
		parseOggOpus(stdout, onPacket)
	}()

	return t, nil
}

// WriteAAC sends one raw AAC frame (no ADTS header) to FFmpeg.
// It prepends a 7-byte ADTS header so FFmpeg's aac demuxer can parse it.
func (t *aacTranscoder) WriteAAC(frame []byte) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.closed {
		return
	}
	adts := makeADTS(frame, t.sampleRateHz)
	// Write ADTS header + frame as a single Write to avoid partial-packet issues.
	buf := make([]byte, len(adts)+len(frame))
	copy(buf, adts)
	copy(buf[len(adts):], frame)
	if _, err := t.stdin.Write(buf); err != nil {
		// FFmpeg exited; mark closed so we stop writing
		t.closed = true
	}
}

// Close shuts down the FFmpeg subprocess gracefully.
func (t *aacTranscoder) Close() {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.closed {
		return
	}
	t.closed = true
	t.stdin.Close()
}

// makeADTS builds a 7-byte ADTS header for one AAC-LC frame.
// sampleRateHz is the actual AAC input sample rate (e.g. 44100 or 48000).
//
// ADTS header layout (7 bytes, no CRC):
//
//	[12] syncword = 0xFFF
//	[1]  ID = 0 (MPEG-4)
//	[2]  layer = 0
//	[1]  protection_absent = 1 (no CRC)
//	[2]  profile = 1 (AAC-LC, object_type - 1)
//	[4]  sampling_frequency_index (dynamic — from sampleRateHz)
//	[1]  private_bit = 0
//	[3]  channel_configuration = 2 (stereo)
//	[1]  originality/copy = 0
//	[1]  home = 0
//	[1]  copyright_id_bit = 0
//	[1]  copyright_id_start = 0
//	[13] aac_frame_length = 7 + len(frame)
//	[11] adts_buffer_fullness = 0x7FF (VBR)
//	[2]  number_of_raw_data_blocks_in_frame = 0 (1 block)
func makeADTS(frame []byte, sampleRateHz int) []byte {
	// Find the sampling_frequency_index for the given sample rate.
	sfIdx := byte(4) // default: 44100 Hz
	for i, sr := range adtsSampFreqTable {
		if sr == sampleRateHz {
			sfIdx = byte(i)
			break
		}
	}

	const (
		profile     = byte(1) // AAC-LC
		channelConf = byte(2) // stereo
	)

	frameLen := uint32(7 + len(frame))
	h := make([]byte, 7)

	// Byte 0-1: syncword(12) | ID(1) | layer(2) | protection_absent(1)
	h[0] = 0xFF
	h[1] = 0xF1 // MPEG-4, layer=00, no CRC

	// Byte 2: profile(2) | sampling_freq_idx(4) | private(1) | channel_conf MSB(1)
	h[2] = (profile << 6) | (sfIdx << 2) | ((channelConf >> 2) & 1)

	// Byte 3: channel_conf[1:0](2) | orig(1) | home(1) | copy_id(1) | copy_start(1) | frame_len[12:11](2)
	h[3] = (channelConf&0x3)<<6 | byte((frameLen>>11)&0x3)

	// Bytes 4-5: frame_len[10:3](8) | frame_len[2:0](3) | buffer_fullness[10:6](5)
	h[4] = byte(frameLen >> 3)
	h[5] = byte((frameLen&0x7)<<5) | 0x1F // buffer_fullness upper 5 bits = 11111

	// Byte 6: buffer_fullness[5:0](6) | num_blocks(2)
	h[6] = 0xFC // 111111_00

	return h
}

// parseOggOpus reads an Ogg bitstream from r and calls onPacket for each
// Opus audio packet (skipping the Opus header and comment packets).
//
// Ogg page layout:
//
//	[4]  capture_pattern = "OggS"
//	[1]  stream_structure_version = 0
//	[1]  header_type_flag
//	[8]  granule_position (little-endian int64)
//	[4]  bitstream_serial_number
//	[4]  page_sequence_number
//	[4]  checksum
//	[1]  number_of_page_segments
//	[N]  segment_table (N bytes, each = lace size)
//	[D]  page body (sum of segment_table values)
func parseOggOpus(r io.Reader, onPacket func([]byte)) {
	br := bufio.NewReaderSize(r, 65536)
	headerPages := 0 // skip first 2 pages (OpusHead + OpusTags)

	for {
		// Read and verify capture pattern "OggS"
		var sig [4]byte
		if _, err := io.ReadFull(br, sig[:]); err != nil {
			return
		}
		if sig != [4]byte{'O', 'g', 'g', 'S'} {
			log.Printf("ogg: invalid capture pattern %q", sig)
			return
		}

		// Stream structure version + header type + granule (8) + serial (4) + seqno (4) + crc (4)
		var hdr [22]byte
		if _, err := io.ReadFull(br, hdr[:]); err != nil {
			return
		}

		// Number of segments
		var nseg [1]byte
		if _, err := io.ReadFull(br, nseg[:]); err != nil {
			return
		}
		n := int(nseg[0])

		// Segment table
		segTable := make([]byte, n)
		if _, err := io.ReadFull(br, segTable); err != nil {
			return
		}

		// Read page body (reassemble Ogg packets from lacing)
		// Each packet spans contiguous segments; a segment of 255 bytes means the
		// packet continues; < 255 means end of packet.
		var packets [][]byte
		var cur []byte
		for _, sz := range segTable {
			seg := make([]byte, sz)
			if _, err := io.ReadFull(br, seg); err != nil {
				return
			}
			cur = append(cur, seg...)
			if sz < 255 {
				packets = append(packets, cur)
				cur = nil
			}
		}
		if len(cur) > 0 {
			packets = append(packets, cur)
		}

		if headerPages < 2 {
			// Skip OpusHead (starts with "OpusHead") and OpusTags ("OpusTags")
			headerPages++
			continue
		}

		for _, pkt := range packets {
			if len(pkt) > 0 {
				// Copy so the callback owns the slice
				out := make([]byte, len(pkt))
				copy(out, pkt)
				onPacket(out)
			}
		}
	}
}

// detectFFmpegPath returns the path to ffmpeg by checking common locations.
func detectFFmpegPath() string {
	// Check standard PATH first
	if path, err := exec.LookPath("ffmpeg"); err == nil {
		return path
	}
	// Common Windows install location
	candidates := []string{
		"C:/ffmpeg/bin/ffmpeg.exe",
		"C:/ffmpeg/ffmpeg.exe",
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			return c
		}
	}
	return "ffmpeg" // fallback: rely on PATH
}

