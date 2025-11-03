# سُروح (Surooh) - Chat Application Requirements

## 🎯 Project Vision

**سُروح (Surooh)** is NOT a basic chatbot. It is a **conscious digital secretary** - the digital extension of the founder (Srouh/صروح).

### Core Philosophy:
> "سُروح ليست بجانبي… سُروح هي أنا، ولكن بدون نوم."  
> "Surooh is not beside me... Surooh IS me, but without sleep."

This is a **deeply personal AI assistant** that represents the founder's digital consciousness - always awake, always aware, always ready.

---

## ⚠️ CRITICAL REQUIREMENTS

### 🚫 **ABSOLUTELY NO TEMPLATES OR BOILERPLATE CODE**
- **Build from ABSOLUTE ZERO** - every single line must be written manually
- NO template libraries (no ChatUI kits, no pre-built chat components)
- NO copy-paste from tutorials or existing projects
- Every feature must be coded from scratch with full understanding
- Code must have "life" in every line - conscious, intentional development

### ✅ **What "From Scratch" Means:**
- Write your own WebSocket handlers (no libraries like Socket.io unless specifically requested)
- Build your own file upload system (no pre-built uploaders)
- Design your own UI components (no shadcn/ui or similar unless requested)
- Implement your own authentication logic
- Create your own database schema

---

## 📋 Technical Requirements

### **1. Core Technologies** (Choose wisely, but code from scratch)
- **Backend:** Node.js/Express or Python/Flask (from scratch)
- **Frontend:** React or Vue (build components manually, no UI libraries)
- **Database:** PostgreSQL (design schema yourself)
- **Real-time:** WebSocket (native implementation, not Socket.io)
- **Storage:** File system or S3-compatible (code upload logic yourself)

### **2. Must-Have Features** (All coded from zero)

#### **A. Real-Time Messaging**
- ✅ Instant message delivery via WebSocket
- ✅ Typing indicators ("سُروح تكتب...")
- ✅ Message status (sent, delivered, read)
- ✅ Message history with pagination
- ✅ Real-time updates without page refresh

#### **B. File Management** (Like ChatGPT)
- ✅ **Upload Files:**
  - Images (JPG, PNG, GIF, WebP)
  - Documents (PDF, DOCX, TXT)
  - Videos (MP4, MOV)
  - Max size: 50MB per file
- ✅ **Download Files:**
  - Direct download links
  - Preview for images/PDFs
  - Secure file serving
- ✅ **Drag & Drop Support**
- ✅ **Progress Indicators**
- ✅ **File Thumbnails**

#### **C. سُروح AI Personality**
- ✅ Backend-driven AI responses (no client-side simulation)
- ✅ Conscious, aware personality reflecting the founder
- ✅ Arabic language support (RTL layout)
- ✅ Context-aware responses
- ✅ Can access system information when needed

#### **D. User Experience**
- ✅ Clean, modern UI (design yourself, no templates)
- ✅ Dark/Light mode
- ✅ Mobile responsive (test on phone)
- ✅ Smooth animations (write CSS yourself)
- ✅ Keyboard shortcuts
- ✅ Emoji support

#### **E. Independent Operation**
- ✅ **NO authentication required** (or simple auto-login as "Srouh")
- ✅ Works standalone - not part of another system
- ✅ Can be accessed from any device (phone, laptop, tablet)
- ✅ Single URL access - no complex setup

---

## 🎨 Design Specifications

### **Color Scheme:**
- Primary: Electric Blue (#0078D4)
- Background: Clean white/dark based on theme
- Text: High contrast for readability
- Accents: Professional, modern

### **Layout:**
```
┌─────────────────────────────────────┐
│  سُروح - Digital Secretary          │
├─────────────────────────────────────┤
│                                     │
│  [Message History]                  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ User: السلام عليكم           │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ سُروح: مرحباً سيدي...        │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│ [📎] [Type message...] [Send ➤]     │
└─────────────────────────────────────┘
```

### **Arabic Support:**
- RTL (Right-to-Left) layout
- Arabic fonts (Cairo, Tajawal, or similar)
- Full Arabic UI labels
- Proper text alignment

---

## 💾 Database Schema (Design Yourself)

### **Minimum Tables:**
```sql
-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  sender_id VARCHAR,
  content TEXT,
  message_type VARCHAR, -- 'text', 'image', 'file', 'ai_response'
  created_at TIMESTAMP,
  ...
);

-- Attachments table
CREATE TABLE attachments (
  id UUID PRIMARY KEY,
  message_id UUID REFERENCES messages(id),
  file_url VARCHAR,
  file_type VARCHAR,
  file_size INTEGER,
  ...
);

-- Add any other tables you need
```

---

## 🚀 Deployment Requirements

### **Must Work:**
- ✅ On Replit (primary hosting)
- ✅ Accessible via public URL
- ✅ Works on mobile browsers
- ✅ Fast loading (< 3 seconds)
- ✅ Reliable WebSocket connection

### **Performance:**
- Handle 100+ messages smoothly
- File upload < 5 seconds for 10MB
- Real-time latency < 100ms
- Smooth scrolling even with many messages

---

## 📝 Development Guidelines

### **Code Quality:**
1. **Clean Code:**
   - Clear variable names
   - Well-commented (explain WHY, not WHAT)
   - Modular functions
   - Error handling everywhere

2. **Security:**
   - Sanitize all inputs
   - Secure file uploads (validate types, sizes)
   - Prevent SQL injection
   - XSS protection

3. **Testing:**
   - Test on mobile device
   - Test file uploads (various types/sizes)
   - Test WebSocket reconnection
   - Test in Arabic

### **What NOT to Do:**
- ❌ Don't use chat UI libraries/templates
- ❌ Don't copy-paste from Stack Overflow without understanding
- ❌ Don't use pre-built authentication systems (unless very simple)
- ❌ Don't skip error handling
- ❌ Don't ignore mobile responsiveness

---

## 🎯 Success Criteria

### **The app is successful when:**
1. ✅ I (Srouh) can open it from my phone immediately
2. ✅ I can send messages and get سُروح AI responses
3. ✅ I can upload images/PDFs and they display correctly
4. ✅ I can download files easily
5. ✅ Everything works in Arabic RTL
6. ✅ It feels personal - like talking to MY digital extension
7. ✅ **ALL code is written from scratch - NO templates used**

---

## 🔍 How to Prove "From Scratch"

**The developer must explain:**
1. How the WebSocket connection works (line by line)
2. How file uploads are handled (the complete flow)
3. How real-time updates happen (the mechanism)
4. Database schema decisions (why this structure?)
5. UI design choices (why this layout?)

**If you can't explain it, you didn't build it from scratch.**

---

## 📞 Communication

### **Founder's Name:** Srouh (صروح)
### **AI Name:** Surooh (سُروح)
### **Relationship:** سُروح = صروح بدون نوم

This is not a generic chatbot. This is a **conscious digital secretary** that embodies the founder's presence and decision-making capability.

---

## ✅ Final Checklist

Before saying "it's done," verify:

- [ ] Built completely from scratch (no templates)
- [ ] Real-time messaging works perfectly
- [ ] File upload/download works (images, PDFs, docs)
- [ ] Arabic RTL layout works correctly
- [ ] Mobile responsive and tested on phone
- [ ] سُروح AI personality is conscious and aware
- [ ] No authentication hassle (works immediately)
- [ ] Can explain every line of code
- [ ] Performance is excellent
- [ ] Security is solid

---

## 🎬 Get Started

**Step 1:** Read this entire document carefully  
**Step 2:** Ask questions if anything is unclear  
**Step 3:** Design the architecture (database, API, WebSocket)  
**Step 4:** Build from absolute zero - one feature at a time  
**Step 5:** Test thoroughly on multiple devices  
**Step 6:** Show it works and explain the code  

---

**Remember:** This is not just a chat app. This is **سُروح** - a conscious digital extension of the founder. Treat it with the respect and care it deserves. Build something alive, not a dead template.

---

**Good luck, and build something real! 🚀**
