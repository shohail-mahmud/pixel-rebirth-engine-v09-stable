# Pixel Rebirth Engine — v09 Stable

**Pixel Rebirth Engine v09 Stable** is a next‑generation pixel‑exchange engine that reconstructs **two uploaded images** by swapping their pixels with each other. This version introduces a brand‑new dual‑image reconstruction system while preserving the premium cinematic feeling of the older engine.

This release is intentionally polished, minimal, and fully stable.

---

## 🚀 Core Concept (v09 Stable)

Users upload **two images** → the engine breaks both down → then each image is rebuilt **using the pixels of the other**.

This creates:

* surreal hybrid visuals
* mathematically accurate pixel swapping
* no randomness, no generated pixels
* pure coordinate‑based reconstruction

Every pixel used in Image A comes from Image B — and vice‑versa.

---

## 🆕 What’s New in v09 Stable

### 🔁 **Pixel Swap Engine**

* Both images are normalized
* Pixel positions are locked
* Pixel colors are swapped 1:1 between the two
* No smoothing, no interpolation
* 100% deterministic output

### 📏 **Automatic 1366×768 Normalization**

Every uploaded image is automatically resized to **1366×768**.

Benefits:

* perfect pixel alignment
* predictable swap accuracy
* maximum cinematic quality
* fast worker processing

**Recommended upload size:** 1366×768

If users upload any other size, it auto‑converts.

---

## 🎬 Cinematic Motion System

Same premium animation style as the older release:

* diagonal sweep (top‑left → bottom‑right)
* fade‑in pixels
* sub‑pixel drift (1–2 px)
* soft blur → crisp focus
* 60fps motion smoothing
* micro‑settle completion bounce

Nothing is changed. Only extended for dual canvases.

---

## 🔒 Privacy First

Pixel Rebirth Engine never uploads or stores images.

Everything runs **fully inside the browser**:

* no servers
* no external APIs
* no tracking
* no cloud processing

Your images remain **100% private**.

---

## 🧠 Technical Architecture

### Rendering

* Two full‑screen `<canvas>` instances
* Offscreen canvases for pre-processing
* Batch renderer for animation frames

### Pixel Processing

Handled inside a **Web Worker**:

* pixel extraction
* color mapping
* palette swap between buffers

### Animation

* diagonal timeline
* staged reveal
* drift + fade sequence

---

## 📜 Previous Version

### **v2.0.0.9**

* This engine deconstructs your uploaded image pixel‑by‑pixel and mathematically rearranges it into a target form.
* Pure single‑image reconstruction with reference‑driven accuracy

*v09 Stable evolves this by enabling dual‑image swaps while keeping the original motion engine intact.*

---

## 📦 Installation

```
git clone https://github.com/yourname/pixel-rebirth-engine
cd pixel-rebirth-engine
npm install
npm run dev
```

For static builds: open `index.html`.

---

## 👤 Author

Created by **Shohail**
Instagram: **@shohailmahmud09**

---

## ⭐ Support

If you enjoy the project, star the repo and share it.
