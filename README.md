# PenPals AI: Video Portral and Social Network for classrooms and SEND

**PenPals AI** is a **video portal and social network** designed for classrooms, enabling instant meaningful conversation betweeen students and teachers worldwide. Built for primary and secondary schools (including SEND), PenPals AI simplifies global collaboration by automating matchmaking, integrating real-time meetings via **Webex**, and providing **live translations powered by Intels OpenVino platform** -- al throgh an intuitive, map-based interface.

Under the hood, [MirrorMirror](https://github.com/YodaImperium/MirrorMirrorEngine) is the scalable, general-purpose engine that powers PenPals AI. It handles user profiles, friend networks, posts, ands real-time interactions, kaing it adaptable for other collaborative applications.

---

## Key Features

- **Interactive Map:** Visualise and connect with classrooms globally.
- **Smart Matchmaking:** Pair classrooms based on shared interests and goals.
- **Real-time Video:** Engage in instant, high-quality video conversations.
- **Live Translation:** Access real-time translations powered by Intel OpenVino.
- **Social Network:** Build and maintain relationships with classrooms worldwide.

---

## Why PenPals AI?

- **For Teachers:** Reduce administrative workload and enrich lessons with global perspectives.
- **For Students:** Gain diverse, real-world learning experiences.
- **For Developers:** Leverage [MirrorMirror](https://github.com/YodaImperium/MirrorMirrorEngine) to build your own collaborative apps.

---

## Getting Started

1. **Clone the repository:**
```bash
    git clone https://github.com/HarinChan/PenPals.git
    cd PenPals
```

2. **Install dependencies:**
```bash
    cd penpals-frontend
    npm install
```

3. **Run the backend (alternatively run MirrorMirror):**
```bash
    cd penpals-backend
    pip install -r requirements.txt
    python src/app.py
```

4. **Run the app:**
```bash
    cd penpals-frontend
    npx tauri dev
```

---

## Roadmap

- [ ] Add live translation
- [ ] Add support for group calls
- [x] Add WebEx integration
- [x] Add real-time video
- [x] Add matchmaking