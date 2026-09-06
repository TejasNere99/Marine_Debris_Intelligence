# SIH26057 — INDIVIDUAL TASKS
## What each person needs to study, research, and build

---

# PERSON A — Data & Preprocessing

### Study first
- How side-scan sonar images actually form: the bright highlight + acoustic shadow pattern, and why shadow length relates to object height, sonar altitude, and range.
- What speckle noise is and why it's different from ordinary camera noise.
- The basic idea behind Syn2Real domain generalization — training on synthetic data to cope with real-world data scarcity.

### Build
- Gather every usable public sonar dataset you can find (the Valdenegro-Toro marine debris dataset, any public side-scan sonar mine dataset, general sonar-image datasets as texture references) and organize them into one consistent format.
- Build a synthetic sonar image generator that produces realistic seafloor textures with proper speckle noise.
- Add synthetic debris and net shapes to these images with **physically correct acoustic shadows** — the shadow length must actually correspond to a real object height given an assumed sonar altitude and range, not just look shadow-shaped. This is the single most important thing you build, because Person B's physics-verification module depends entirely on this being done correctly.
- For every synthetic image you generate, record the true object height, sonar altitude, and range you used — this becomes the ground truth Person B validates their physics module against.
- Build the preprocessing pipeline: noise reduction, resolution normalization across different image sizes, and detection/masking of dropped-out or corrupted image sections.
- Combine everything — public and synthetic — into one labeled dataset, split into training and validation sets, ready to hand to Person B.

---

# PERSON B — Detection & Confidence Model

### Study first
- How object detection models like YOLO or U-Net work at a conceptual level — you don't need to derive the math, but you need to understand what "training" and "fine-tuning" actually do.
- The WPG-DetNet research approach — specifically how it fuses learned detection with physical shadow-geometry checks to cut false positives. Understand this well enough to explain it simply.
- The actual geometry connecting shadow length, object height, sonar altitude, and range — be able to derive or at least clearly explain why this relationship holds.

### Build
- Fine-tune a pretrained detection model on Person A's dataset to detect and localize debris in sonar images.
- Build the **physics-informed verification module**: for every detection, calculate what shadow length a real object at that position should cast, compare it to the shadow actually observed in the image, and use any mismatch as evidence of a false positive (a rock or natural feature won't match this physical relationship the way a real object does).
- Validate this physics module directly against Person A's known ground-truth data before worrying about the detection model's overall accuracy — this validation is something you can demonstrate independently and it's your strongest technical proof point.
- Build a confidence-fusion system that combines the detection model's raw confidence with the physics-consistency result into one final, calibrated confidence score per detection.
- Add an explainability layer — a heatmap showing which part of the image drove each detection, so the system's decisions aren't a black box.
- Package the whole thing into one clean, well-documented function that takes an image in and returns confidence-scored, physics-verified detections out — this is what Person C will call.
- Prepare a lightweight/exported version of your model suitable for on-device deployment, since this is a baseline requirement for any real underwater system, not an optional extra.

---

# PERSON C — Backend, Dashboard & Integration

### Study first
- Basic patterns for building a backend API that accepts file uploads and returns structured results, if you're not already comfortable with this.
- How to display geographic points on an interactive map in a web frontend.

### Build
- A backend service that accepts an uploaded sonar image and its metadata, passes it to Person B's detection function, and returns the results in a clean structured format.
- The geotagging and reporting logic: match each detection to a real geographic location using the uploaded metadata, and generate a downloadable structured report (JSON and CSV).
- The full dashboard: a place to upload a sonar log, see every detection plotted on a map with its confidence score and physics-check result clearly visible, view the explainability heatmap for any detection, and download the final report.
- **Own the integration of the entire system.** Set up a shared, agreed structure for how Person A's data, Person B's model, and your application all fit together early, before everyone builds in isolation — and run the complete pipeline end to end repeatedly as pieces come together, not just once at the very end. Catching a mismatch early is a minor fix; catching it late is a crisis.

---

# PERSON D — YOU (Research, Narrative, Coordination)

### Study first, deeply
- The Valdenegro-Toro paper — the field's foundational work.
- Exactly how GhostNetZero works, including its real limitations (geography, accuracy) so you can position your project honestly against it.
- The WPG-DetNet paper's approach in real depth — you need to be able to explain and defend the physics-informed concept as fluently as Person B can, since you'll be the one fielding hard questions about it.
- The actual sonar shadow geometry — understand the relationship between shadow length, object height, altitude, and range well enough to explain it from first principles, not just recite it.
- Syn2Real domain generalization, at least at an explainer level.
- The real numbers behind the Gulf of Mannar case: the dugong population estimate, the documented threat of net entanglement, and the specific gap in current detection methods.

### Build / produce
- The complete pitch narrative, written and internalized in your own words — not memorized verbatim, understood well enough to adapt on the spot.
- A full bank of anticipated hard questions with genuine, specific answers — not generic hackathon answers, answers grounded in what you actually researched.
- Ongoing coordination between your research and the technical team's actual work — if something you learn changes how a piece should be built, you tell that person directly and immediately, not just at the end.
- The initial outreach message for Person F to send — you're best placed to write this since it needs to be technically accurate and specific to be taken seriously.
- A clear, honest, current answer to "what's actually built versus what's still planned" at any point someone asks — this single answer matters more than almost anything else in this document.

---

# PERSON E — Presenter

### Study first
- The pitch narrative and the core technical concepts (the two-layer USP, the physics-informed approach, the prior-art positioning) well enough to explain them simply and confidently to someone with no technical background.

### Build / produce
- The visual slide deck — clean, simple, one idea per slide, built to support spoken delivery rather than to be read by the judge instead of listened to.
- Your actual spoken delivery of the pitch, rehearsed until it sounds natural rather than recited.
- The live demo choreography, planned closely with Person C — know exactly what will be shown, in what order, and make sure the moment where a false positive gets correctly filtered by the physics check is deliberately built into the flow, not left to chance.
- A plan for handling Q&A as a team — deciding roughly who should field which type of question (technical model questions, data questions, product/deployment questions) so no one gets cornered answering something outside their depth.
- The demo video needed for later submission stages, once there's something real to show.

---

# PERSON F — Outreach, Documentation & Logistics

### Study first
- Enough of the overall project to write about it clearly and accurately — you don't need deep technical fluency, but you need to genuinely understand what's being built and why.

### Build / produce
- Real outreach: contact the Tamil Nadu Forest Department and/or researchers working on dugong conservation in the Gulf of Mannar–Palk Bay corridor, using Person D's message as a base. Send it, follow up, and document whatever response (or lack of one) you get — this attempt itself is valuable material for the pitch.
- The technical report and user manual documentation, built up as the technical team actually produces results — write clearly, don't wait until the end to start.
- A shared tracker across the team for who owns what, current status, and any risks that are starting to look real (data not coming together, a module not working as expected, and so on) — and actually flag these to the team when you notice them, rather than just logging them silently.
- General logistics support wherever it's needed — whatever administrative or last-minute need comes up before a round, you're the person who catches it.

---

*Everyone's work connects at one point: Person A's data feeds Person B's model, Person B's model feeds Person C's application, and Person D and E turn all of it into something the team can defend out loud. If any one piece is unclear to the person building it, that is the moment to ask — not the moment to guess and hope it fits later.*
