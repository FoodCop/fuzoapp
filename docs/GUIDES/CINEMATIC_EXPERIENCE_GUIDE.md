# Developer Guide: Cinematic Landing Experience

This guide details the architecture, styling, and asset management for the FUZO V2 "Cinematic Intro" landing page. Use this for onboarding new developers and maintaining the high-impact visual experience.

---

## 🏗️ Technical Root
The entire landing experience is orchestrated as a single-page immersive layer within the main application entry point.

- **Primary File**: `k:\H DRIVE\Quantum Climb\APPS\FUZO_V2\index.tsx`
- **Core Component**: `HeroCarousel`
- **Logic**: Automatically rotates through 6 feature slides using `setInterval` and Framer Motion.

---

## 📝 Content Management
Text and video mapping are controlled via the `LANDING_FEATURES` constant. 

### Location: `index.tsx` (approx. line 3330)
```typescript
const LANDING_FEATURES = [
  {
    subtitle: "FUZO",
    title: "THE UNDISCOVERED GASTRONOMY",
    description: "The worlds first AI native discovery engine...",
    microline: "Think less Create more Access more",
    video: "/videos/video6.mp4",
    image: "...", // Used for Auth/Onboarding background heritage
    icon: ChefHat,
    isHero: true
  },
  // ... (Slides 1-5 follow)
];
```

### Content Sanitization Rules:
To maintain a minimalist, "Elite" typographic look:
1.  **NO Commas**: Removes visual noise.
2.  **NO Hyphens**: Prevents line-wrap issues on mobile.
3.  **Uppercase Title**: Enforced via Tailwind `font-black uppercase`.

---

## 🎥 Video & Media Assets
The platform is 100% video-first. Legacy Unsplash images are **NOT** used in the carousel (no posters, no fallbacks).

### Asset Location: `/public/videos/`
- **Naming Pattern**: `video1.mp4` through `video6.mp4`.
- **Implementation**: 
  - `autoPlay`, `muted`, `loop`, `playsInline` are required.
  - `opacity-60` is applied to the video layer to ensure typography legibility.

---

## 🎨 Style & Typography Tokens
The landing page uses a specific sub-set of the design system for high-impact readability.

- **Background**: `bg-stone-950` (#0c0a09).
- **Typography**:
  - `h2`: Reduced by 15% from original design for a more balanced "Discovery" feel.
  - **Centering**: All text items use `text-center` and flex-box alignment.
- **Responsive Padding**:
  - **Mobile**: `pt-32` (top) to clear the top-navigation ChefHat icon.
  - **Mobile Side Padding**: `p-10` (increased for better text breathing room).

---

## 🎬 Motion System (Framer Motion)
The carousel uses a "Liquid Cross-Fade" system.

- **Orchestration**: `AnimatePresence` with `initial={false}`. 
  - **NOTE**: `mode="wait"` is intentionally omitted to allow simultaneous cross-fading (no black flashes).
- **Transition Settings**:
  - **Outer Container**: `duration: 2, ease: "easeInOut"`
  - **Video Layer**: `duration: 2.2` (slightly delayed to allow background logic to settle).

---

## 🛠️ Maintenance Checklist
1.  **Changing a Headline**: Edit the `title` or `description` in `LANDING_FEATURES`.
2.  **Editing a Video**: Replace the `.mp4` file in `/public/videos/` with the same filename.
3.  **Adjusting Rotation Speed**: Modify the `timer` value in `HeroCarousel` (default: `8000`ms/8s).
4.  **Scaling Content**: Adjust the `motion.div` classes inside the `HeroCarousel` return block.

---

> [!IMPORTANT]
> **Asset Integrity**: Before adding new videos, ensure they are pre-compressed for web to avoid high LCP (Largest Contentful Paint) times. Aim for < 5MB per video.
