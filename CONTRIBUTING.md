# Contributing to Local Stream Server 🤝

Thank you for considering contributing! This project helps people test streaming setups and learn about live streaming.

## 🎯 How You Can Help

### For Everyone:
- 🐛 **Report bugs** - Found an issue? Open an issue!
- 💡 **Suggest features** - Have ideas? We'd love to hear them!
- 📖 **Improve docs** - Fix typos, add examples, clarify instructions
- ⭐ **Star the repo** - Helps others discover the project!
- 📢 **Share** - Tell others who might benefit

### For Developers:
- 🔧 **Fix bugs** - Check open issues
- ✨ **Add features** - New encoders, UI improvements
- 🧪 **Add tests** - Improve code quality
- 🌍 **Translations** - Help non-English speakers

## 📝 Reporting Issues

**Before submitting:**
1. Check if issue already exists
2. Use the latest version
3. Check documentation first

**When reporting:**
```markdown
**Description:**
Clear description of the issue

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**System Info:**
- OS: Windows 10 / macOS 13 / Ubuntu 22.04
- Node.js version: v20.x.x
- Browser: Chrome 120

**Logs:**
(Paste relevant error messages)
```

## 🔧 Pull Requests

### Small Changes (docs, typos, small fixes):
1. Fork the repo
2. Make your changes
3. Submit PR with clear description

### Large Changes (new features):
1. Open an issue first to discuss
2. Fork the repo
3. Create a branch: `git checkout -b feature/your-feature`
4. Make your changes
5. Test thoroughly
6. Submit PR with:
   - Clear description
   - Why the change is needed
   - How you tested it
   - Screenshots (if UI changes)

## 🎨 Code Style

**JavaScript:**
```javascript
// Use clear variable names
const streamTitle = 'My Stream';  // Good
const st = 'My Stream';          // Bad

// Use comments for complex logic
// Calculate stream health based on bitrate and dropped frames
const health = calculateHealth(bitrate, droppedFrames);

// Handle errors
try {
  const response = await fetch('/api/stream');
  const data = await response.json();
} catch (error) {
  console.error('Failed to fetch stream:', error);
  showErrorNotification('Unable to load streams');
}
```

**CSS:**
```css
/* Use BEM-like naming */
.stream-card { }
.stream-card__title { }
.stream-card--live { }

/* Group related properties */
.element {
  /* Layout */
  display: flex;
  
  /* Positioning */
  position: relative;
  
  /* Box model */
  padding: 10px;
  
  /* Visual */
  color: white;
  
  /* Animation */
  transition: all 0.2s;
}
```

## 🧪 Testing Your Changes

**Before submitting:**

1. **Test locally:**
```bash
npm start
# Check server starts without errors
# Test in browser
# Try creating/deleting streams
# Test with OBS if applicable
```

2. **Test on different platforms:**
- Windows (if possible)
- macOS (if possible)
- Linux (if possible)

3. **Test different scenarios:**
- New installation
- Existing installation
- With FFmpeg
- Without FFmpeg

4. **Check documentation:**
- Update relevant docs
- Add examples if needed
- Update README if adding features

## 📚 Documentation Style

**Use simple language:**
```markdown
✅ Good: "Click the Create Stream button"
❌ Bad: "Instantiate a stream object via the UI interface"

✅ Good: "The server will start on port 8000"
❌ Bad: "The HTTP server instance will bind to TCP port 8000"
```

**Be specific:**
```markdown
✅ Good: "Run `npm install` in the project folder"
❌ Bad: "Install dependencies"

✅ Good: "Open http://localhost:8000 in Chrome or Firefox"
❌ Bad: "Access the web interface"
```

**Use examples:**
```markdown
✅ Good:
Enter your stream title, for example:
- "Test Stream 1"
- "Gaming Stream"
- "Presentation Rehearsal"

❌ Bad:
Enter a title for your stream.
```

## 🎯 Priority Areas

**Most helpful contributions:**

1. **Testing on different platforms**
   - Windows versions
   - macOS versions  
   - Linux distros
   - Report compatibility issues

2. **Documentation improvements**
   - More examples
   - Common problems
   - Video tutorials
   - Screenshots

3. **Translations**
   - Spanish
   - French
   - German
   - Chinese
   - Other languages

4. **Feature requests**
   - Recording streams
   - Multiple bitrate support
   - Chat integration
   - Authentication options

5. **Bug fixes**
   - Check issues tagged `good first issue`
   - Check issues tagged `help wanted`

## 💬 Communication

**Be respectful:**
- This is a learning-friendly project
- Beginners are welcome
- Ask questions if unclear
- Help others when you can

**Be patient:**
- This is maintained by volunteers
- Response time varies
- We'll get to your issue/PR

**Be clear:**
- Explain your thinking
- Provide context
- Share relevant info

## 🎓 Learning Resources

**New to streaming?**
- Read GETTING_STARTED.md
- Read OBS_SETUP_GUIDE.md
- Join OBS forums

**New to Node.js?**
- https://nodejs.org/en/learn
- https://github.com/nodejs/node

**New to Git/GitHub?**
- https://try.github.io/
- https://docs.github.com/en/get-started

**New to open source?**
- https://opensource.guide/
- https://firstcontributions.github.io/

## ⭐ Recognition

Contributors are recognized in:
- README.md Contributors section
- Release notes
- Project website (if created)

**All contributions matter:**
- Code
- Documentation
- Bug reports
- Feature ideas
- Testing
- Spreading the word

## 🚀 Release Process

1. Features merged to `main`
2. Version bumped (semantic versioning)
3. Release notes created
4. npm package updated (if applicable)
5. Contributors credited

## 📜 Code of Conduct

**Be nice:**
- Respect everyone
- Help beginners
- Share knowledge
- Build together

**Don't:**
- Be rude or dismissive
- Spam or advertise
- Share malicious code
- Harass anyone

## 🎉 Thank You!

Every contribution helps make streaming more accessible to everyone. Whether you:
- Fix a typo
- Report a bug
- Add a feature
- Help someone in issues
- Share the project

**You're making a difference!** 🙌

---

**Questions?** Open an issue with the `question` label!
