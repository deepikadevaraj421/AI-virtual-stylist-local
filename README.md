# 🎨 AI Virtual Stylist

> AI-powered wardrobe assistant that uses CNN, KNN, and XGBoost to recommend perfect outfit combinations.

## 🏗 Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** MongoDB Atlas
- **ML Service:** Python Flask (CNN + KNN + XGBoost)

## 📁 Project Structure

```
AI-Stylist-Project/
├── client/                # React frontend
│   └── src/
│       ├── context/       # Auth context
│       ├── layouts/       # Dashboard layout
│       ├── pages/         # All pages
│       └── services/      # API service
├── server/                # Node.js backend
│   ├── config/            # DB config
│   ├── controllers/       # Route handlers
│   ├── middleware/         # Auth & upload middleware
│   ├── models/            # MongoDB schemas
│   └── routes/            # API routes
├── ml-service/            # Python Flask ML service
├── models/                # Trained ML models
└── src/                   # ML training scripts
```

## 🚀 Getting Started

### 1. Set up MongoDB
Add your MongoDB Atlas connection string to `server/.env`:
```
MONGO_URI=mongodb+srv://your_connection_string
```

### 2. Start Backend
```bash
cd server
npm install
npm run dev
```

### 3. Start Frontend
```bash
cd client
npm install
npm run dev
```

### 4. Start ML Service (Optional)
```bash
cd ml-service
pip install -r requirements.txt
python app.py
```

## 🤖 ML Pipeline

- **CNN (MobileNetV2):** Classifies clothing images (top/bottom/shoes/bag)
- **KNN:** Finds similar bottoms and shoes for a selected top
- **XGBoost:** Scores and ranks outfit combinations

## 📱 Features

- ✅ User Authentication (Register/Login/JWT)
- ✅ Wardrobe Management (Upload/Edit/Delete)
- ✅ Camera & File Upload Support
- ✅ CNN Auto-Classification
- ✅ Daily Top 5 Outfit Recommendations
- ✅ Weekly Outfit Planner
- ✅ Gender-Specific Logic
- ✅ Occasion & Weather Filtering
- ✅ Laundry Tracking
- ✅ Favorites & Outfit History
- ✅ Mobile Responsive Design
