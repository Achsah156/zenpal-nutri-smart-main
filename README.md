# ZENPAL

**Automated, AI-Powered Nutrition Management System**

### TEAM - BIO TITAN

---

## Overview

**ZENPAL (Smart Bowl)** is an **IoT-based intelligent nutrition management system** designed to automate food portioning, improve diet compliance, and provide AI-driven nutritional insights.

The system is specifically built for:

- 🧓 Elderly individuals
- 🏥 Chronic patients & hospitals
- 🏋️ Fitness & weight management users
- 🏠 Remote care & caregiver monitoring

ZENPAL integrates **smart hardware, cloud infrastructure, mobile/web applications, and AI analytics** to eliminate inaccurate food tracking and enable personalized, data-driven nutrition management.

---

## Problem Statement

Traditional nutrition tracking relies heavily on **manual food measurement and user input**, leading to:

- Inaccurate calorie estimation
- Poor diet adherence
- No real-time monitoring
- Limited caregiver involvement

These challenges are critical in healthcare, elder care, and chronic disease management.

---

## Solution

ZENPAL solves these problems using:

- **Automated food dispensing** with precise weight measurement
- **Real-time monitoring** via IoT connectivity
- **Cloud-based analytics**
- **AI-powered dietary recommendations**
- **Remote caregiver access**

---

## Key Features

- ⚖️ **Precision Food Dispensing** using load cell feedback
- 📡 **Real-Time Monitoring** via BLE & Wi-Fi
- ☁️ **Cloud Analytics Dashboard**
- 🤖 **AI-Driven Nutrition & Calorie Recommendations**
- 👨‍⚕️ **Remote Caregiver & Clinician Access**
- 📈 **User Trend & Compliance Tracking**
- 🔐 **Secure & Scalable Architecture**

---

## Website Structure

### Landing Page / Home

- Hero section with Smart Bowl visualization
- Tagline: **"Automated, AI-Powered Nutrition Management"**
- Problem → Solution → Features → Impact → CTA

### Features Page

- Precision dispensing
- Real-time data monitoring
- Cloud analytics
- AI recommendations
- Multi-user & multi-environment support

### Technology Page

#### 🔧 Hardware Stack

- ESP32 Microcontroller
- Load Cell Sensors
- Actuator-Controlled Dispenser
- Power Management Modules

#### 💻 Software Stack

- Arduino IDE (Firmware)
- React.js (Frontend)
- Node.js + Express.js (Backend)
- PostgreSQL (Database)

#### 🏗️ Architecture

- IoT System Block Diagram
- Device → Cloud → Mobile/Web App Flow
- Secure data synchronization

### AI / ML Page

ZENPAL uses AI to provide intelligent insights such as:

- 📊 Food intake trend analysis
- 🔮 Calorie prediction models
- ⚠️ Portion-size anomaly detection
- 🎯 Personalized nutrition recommendations
- 🧠 Adaptive learning from user meal logs

### Impact & Use Cases

- 🧓 **Elder Care & Assisted Living**
- 🏥 **Hospital & Clinical Diet Management**
- 🏋️ **Fitness & Weight Management**
- 👶 **Pediatric Nutrition Monitoring**
- 🏠 **Remote Healthcare & Home Monitoring**

### Team

The project is developed by a **5-member interdisciplinary team**, combining expertise in:

- IoT & Embedded Systems
- Full-Stack Development
- AI & Data Analytics
- Healthcare Technology

| Name | Role |
|------|------|
| K. Achsah Grace | Team Lead & Full Stack Developer |
| N. Srishanth | Backend Developer |
| M. Laxmi Devi | AI/ML Engineer |
| Siddharth | Hardware Engineer |
| Sai Teja | Frontend Developer |

### Contact & Demo

- Contact / Query Form
- Demo Request Section
- Social & professional links

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State Management | TanStack React Query |
| Forms | React Hook Form + Zod |
| Backend | Supabase Edge Functions (Deno) |
| Database | PostgreSQL (via Supabase) |
| Authentication | Supabase Auth |
| Real-time | Supabase Realtime + WebSockets |
| AI & ML | Lovable AI (Gemini/GPT models) + Custom ML Models |
| Hardware | ESP32 + HX711 Load Cell + Servo Motor |
| Deployment | Lovable Cloud |

---

## Project Structure

```
ZENPAL/
│
├── src/
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Route pages
│   ├── integrations/   # Supabase client & types
│   └── assets/         # Static assets
│
├── supabase/
│   └── functions/      # Edge functions for API & real-time
│
├── firmware/
│   └── esp32_code/     # Arduino code for smart bowl
│
└── README.md
```

---

## Getting Started

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## Hardware Integration

The smart bowl uses ESP32 microcontroller with:

- **HX711 Load Cell** - Accurate weight measurement
- **Servo Motor** - Automatic lid control
- **WiFi** - WebSocket connection to backend

---

## Future Enhancements

- 📱 Mobile app (Android & iOS)
- ⌚ Integration with wearable devices
- 🔮 Advanced predictive health analytics
- 🎙️ Voice assistant support
- 💊 Doctor prescription integration

---

## License

MIT

---

### ⭐ If you like this project, don't forget to star the repository!
