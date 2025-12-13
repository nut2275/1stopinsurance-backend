const mongoose = require('mongoose');

// ==========================================
// 1. การตั้งค่า MongoDB (แก้ตรงนี้ให้เป็นของคุณ)
// ==========================================
const MONGO_URI = "mongodb+srv://air1180123_db_user:STcuJ89ErqHid0Jh@1stopinsurance.mheodyg.mongodb.net/?retryWrites=true&w=majority&appName=1stopinsurance"; 

// ==========================================
// 2. สร้าง Schema (โครงสร้างข้อมูล)
// ==========================================
const carInsuranceRateSchema = new mongoose.Schema({
    carBrand: String,
    model: String,
    subModel: String,
    year: Number,
    insuranceBrand: String,
    level: String,      // ชั้น 1, 2+, ฯลฯ
    repairType: String, // อู่ / ห้าง
    coverage: [String], // ["น้ำท่วม", "ไฟไหม้", "สุขภาพ"]
    
    // รายละเอียดความคุ้มครอง (ตัวเลข)
    personalAccidentCoverageOut: Number, // ความรับผิดต่อบุคคลภายนอก
    personalAccidentCoverageIn: Number,  // อุบัติเหตุส่วนบุคคล
    propertyDamageCoverage: Number,      // ความเสียหายต่อทรัพย์สิน (และใช้เป็นทุนประกันรถยนต์)
    perAccidentCoverage: Number,         // ความคุ้มครองต่อครั้ง
    fireFloodCoverage: Number,           // ไฟไหม้/น้ำท่วม
    firstLossCoverage: Number,           // ความรับผิดส่วนแรก
    
    premium: Number,    // เบี้ยประกัน (ราคาขาย)
}, { timestamps: true });

const CarInsuranceRate = mongoose.model('carinsurancerates', carInsuranceRateSchema);

// ==========================================
// 3. ข้อมูลรถยนต์ (Master Data)
// ==========================================
const carData = {
    "Toyota": {
        "Corolla Altis": ["1.6 G", "1.8 Hybrid", "GR Sport"],
        "Yaris": ["Sport", "Smart", "Premium", "Premium S"],
        "Yaris Ativ": ["Sport", "Smart", "Premium", "Premium Luxuly"],
        "Hilux Revo / Hilux": ["Entry Cab", "Smart Cab", "Revo 2.4", "2.8 4x4", "Rocco"],
        "Fortuner": ["2.4 4x2", "2.8 4x4", "GR Sport"],
        "RAV4": ["Entry", "Hybrid", "Adventure"],
        "Camry": ["2.0 G", "2.5 Hybrid"],
        "Vios": ["E", "G", "S"],
        "Avanza / Veloz": ["1.5 G", "Veloz Premium"],
        "Innova": ["V", "Hybrid"],
        "C-HR": ["Entry", "High"],
        "Alphard / Vellfire": ["Executive Lounge", "Hybrid"]
    },
    "Honda": {
        "City": ["S", "SV", "RS", "e:HEV"],
        "Civic": ["EL", "RS Turbo", "e:HEV RS"],
        "CR-V": ["G", "RS", "e:HEV"],
        "HR-V": ["E", "EL", "RS", "e:HEV"],
        "BR-V": ["V", "RS"],
        "Accord": ["Hybrid"]
    },
    "Mazda": {
        "Mazda 2": ["1.3 E", "1.5 C", "SP"],
        "Mazda 3": ["2.0 C", "2.0 S", "2.0 SP"],
        "CX-3": ["Base", "Pro"],
        "CX-30": ["Base", "SP"],
        "CX-5": ["2.0 C", "2.2 XDL", "2.5 Turbo"],
        "CX-8": ["2.5 C", "2.5 SP"]
    },
    "Isuzu": {
        "D-Max": ["1.9 S", "1.9 Z", "3.0 Hi-Lander", "4x4"],
        "MU-X": ["1.9 Elegant", "3.0 Ultimate", "4WD Active"]
    },
    "Mitsubishi": {
        "Triton": ["GL", "GLS", "Athlete"],
        "Pajero Sport": ["GT", "4WD GT Premium"],
        "Xpander": ["1.5 GLS", "Cross"]
    },
    "Nissan": {
        "Almera": ["EL Turbo", "VL Turbo", "Sportech"],
        "Navara": ["Calibre E", "Pro-4X", "VL 4WD"],
        "Kicks": ["E-Power", "V"],
        "Note / Note e-Power": ["Active", "VL"]
    },
    "Ford": {
        "Ranger": ["XL", "XLT", "Wildtrak"],
        "Everest": ["Sport", "Titanium"],
        "Bronco / Bronco Sport": ["Base", "Badlands"]
    },
    "MG": {
        "MG3": ["Standard", "Hybrid+"],
        "ZS": ["1.5", "EV"],
        "HS": ["1.5 Turbo", "PHEV"],
        "ZST": ["HEV", "EV"],
        "Extender": ["GC", "DC"],
        "Maxus (MPV/Pickup)": ["V80", "T90"]
    },
    "Hyundai": {
        "H-1 / Staria": ["Van", "Premium"],
        "Tucson": ["GLS", "Turbo"],
        "Santa Fe": ["GLS", "Hybrid"],
        "Kona": ["EV", "Gasoline"]
    },
    "Kia": {
        "Seltos": ["Base", "Top"],
        "Sportage": ["1.6 Turbo", "Hybrid"],
        "Carnival": ["Premium", "Executive"]
    },
    "Suzuki": {
        "Swift": ["GL", "RS"],
        "Celerio": ["GL"],
        "Jimny": ["3-door", "5-door (import)"],
        "Ertiga": ["GL", "GX"]
    },
    "Subaru": {
        "Forester": ["2.0i-L", "Sport"],
        "Outback": ["2.5i", "Touring"],
        "XV": ["2.0i-L"]
    },
    "BMW": {
        "Series 1": ["116i", "118i"],
        "Series 3": ["320i", "330i"],
        "Series 5": ["520d", "530i"],
        "X1 / X3 / X5": ["sDrive", "xDrive variants"]
    },
    "Mercedes-Benz": {
        "A-Class": ["A200", "A250"],
        "C-Class": ["C200", "C300"],
        "E-Class": ["E200", "E300"],
        "GLA / GLC / GLE": ["various trims"]
    },
    "BYD": {
        "Dolphin": ["Standard", "Pro"],
        "Seal": ["Base", "Performance"],
        "Atto 3": ["Standard", "Long Range"]
    },
    "GWM / Haval": {
        "Haval Jolion": ["Pro", "Premium"],
        "Haval H6": ["Ultra", "Hybrid"],
        "GWM Poer / P-Series": ["Single Cab", "Double Cab"]
    },
    "Changan": {
        "UNI-T": ["Base", "Top"],
        "Alsvin": ["GL", "GLS"]
    },
    "Tesla": {
        "Model 3": ["Standard", "Long Range"],
        "Model Y": ["Standard", "Performance"]
    },
    "VinFast": {
        "VF e34": ["Base", "Plus"],
        "VF 8 / VF 9": ["Standard", "Premium"]
    },
    "Peugeot / Renault": {
        "Peugeot 3008": ["Active", "Allure"],
        "Renault Captur": ["Life", "Intense"]
    },
    "Jeep / Land Rover": {
        "Jeep Wrangler": ["Sport", "Sahara"],
        "Land Rover Defender": ["90", "110"]
    },
    "Chevrolet": {
        "Trailblazer": ["LS", "LT", "Premier"],
        "Colorado": ["Base", "High Country"],
        "Captiva": ["Base", "Pro"]
    },
    "Porsche": {
        "Cayenne": ["Base", "S", "Turbo"],
        "Macan": ["Base", "S", "GTS"],
        "911": ["Carrera", "Turbo"]
    },
    "Lexus": {
        "IS": ["300", "350"],
        "ES": ["250", "300h"],
        "NX": ["250", "350h"],
        "RX": ["300", "450h"]
    },
    "Volvo": {
        "XC40": ["B4", "Recharge"],
        "XC60": ["B5", "Recharge"],
        "XC90": ["B5", "T8 Recharge"]
    }
};

// --- ตัวแปรสำหรับสุ่ม ---
const insuranceCompanies = [
    "วิริยะประกันภัย", "กรุงเทพประกันภัย", "เมืองไทยประกันภัย", 
    "ธนชาตประกันภัย", "ทิพยประกันภัย", "มิตรแท้ประกันภัย", 
    "ไทยศรีประกันภัย", "อาคเนย์ประกันภัย", "สินมั่นคงประกันภัย"
];

// บังคับให้มีทุกชั้น
const allLevels = ["ชั้น 1", "ชั้น 2+", "ชั้น 2", "ชั้น 3+", "ชั้น 3"];
const repairTypes = ["อู่", "ห้าง"];
const startYear = 2018;
const endYear = 2024;

// Helper: สุ่มตัวเลข
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
// Helper: สุ่มจาก Array
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ==========================================
// 4. ฟังก์ชัน Generate แผน (การันตีครบทุกชั้น)
// ==========================================
const generatePlansForCar = (brand, model, subModel, year) => {
    const plans = [];
    
    // *** วนลูปสร้างให้ครบทุกชั้นประกัน (Level) ***
    for (const level of allLevels) {
        
        // สุ่มบริษัทประกันมา 1 แห่ง สำหรับชั้นนี้ (เพื่อให้ดูหลากหลาย)
        const company = getRandomElement(insuranceCompanies);
        
        // สุ่มประเภทซ่อม (อู่/ห้าง) แต่ถ้าเป็นชั้น 3 ส่วนใหญ่จะเป็นอู่
        let repair = getRandomElement(repairTypes);
        if (level === "ชั้น 3" || level === "ชั้น 3+") repair = "อู่";

        // กำหนดเบี้ยและทุนพื้นฐาน (Mockup Logic)
        let basePremium = 0;
        let coverageAmount = 0; // ทุนประกัน
        let features = [];

        switch (level) {
            case "ชั้น 1":
                basePremium = getRandomInt(15000, 28000);
                coverageAmount = getRandomInt(400000, 800000);
                features = ["น้ำท่วม", "ไฟไหม้", "สุขภาพ"];
                break;
            case "ชั้น 2+":
                basePremium = getRandomInt(7500, 13000);
                coverageAmount = getRandomInt(150000, 350000);
                features = ["น้ำท่วม", "ไฟไหม้", "สุขภาพ"];
                break;
            case "ชั้น 2":
                basePremium = getRandomInt(5500, 9000);
                coverageAmount = getRandomInt(100000, 200000);
                features = ["ไฟไหม้", "สุขภาพ"];
                break;
            case "ชั้น 3+":
                basePremium = getRandomInt(5000, 8000);
                coverageAmount = getRandomInt(100000, 150000);
                features = ["สุขภาพ"];
                break;
            case "ชั้น 3":
                basePremium = getRandomInt(1800, 4000);
                coverageAmount = 0; 
                features = ["สุขภาพ"];
                break;
        }

        // ปรับราคาตามอายุรถ (ยิ่งเก่ายิ่งถูกลงนิดหน่อย ทุนลดลง)
        const carAge = 2025 - year;
        coverageAmount = Math.max(0, coverageAmount - (carAge * 20000));
        
        // ปรับราคาซ่อมห้าง
        if (repair === "ห้าง" && level === "ชั้น 1") basePremium += 4000;

        plans.push({
            carBrand: brand,
            model: model,
            subModel: subModel,
            year: year,
            insuranceBrand: company,
            level: level,
            repairType: repair,
            coverage: features,
            
            // สร้างตัวเลขความคุ้มครองย่อยๆ
            personalAccidentCoverageOut: getRandomInt(500000, 2000000), 
            personalAccidentCoverageIn: getRandomInt(50000, 200000),    
            propertyDamageCoverage: getRandomInt(1000000, 5000000), // ความเสียหายต่อทรัพย์สินคนอื่น    
            perAccidentCoverage: getRandomInt(100000, 500000),          
            fireFloodCoverage: (level === "ชั้น 1" || level === "ชั้น 2+") ? coverageAmount : 0, 
            firstLossCoverage: (level === "ชั้น 1") ? 3000 : 0,         
            
            // **สำคัญ** ใช้ field นี้เก็บทุนประกันรถยนต์ (เพื่อให้ตรงกับ Frontend ที่เขียนไว้)
            propertyDamageCoverage: coverageAmount > 0 ? coverageAmount : 0, 
            
            premium: basePremium
        });
    }
    return plans;
};

// ==========================================
// 5. ฟังก์ชันหลัก (Run Script)
// ==========================================
const seedDB = async () => {
    try {
        console.log("🔌 Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected!");

        // --- 1. ลบข้อมูลเก่าทิ้งทั้งหมด ---
        console.log("🗑️ Deleting old data from 'carinsurancerates'...");
        await CarInsuranceRate.deleteMany({});
        console.log("✨ Collection cleared.");

        // --- 2. เตรียมข้อมูลใหม่ ---
        const allPlansToInsert = [];
        console.log("⚙️ Generating new data...");

        for (const [brand, models] of Object.entries(carData)) {
            for (const [model, subModels] of Object.entries(models)) {
                for (const subModel of subModels) {
                    for (let year = startYear; year <= endYear; year++) {
                        // สร้างแผนครบ 5 ชั้น สำหรับรถคันนี้ ปีนี้
                        const plans = generatePlansForCar(brand, model, subModel, year);
                        allPlansToInsert.push(...plans);
                    }
                }
            }
        }

        console.log(`📦 Total records to insert: ${allPlansToInsert.length}`);
        
        // --- 3. บันทึกลง DB (แบ่ง Batch) ---
        const batchSize = 1000;
        for (let i = 0; i < allPlansToInsert.length; i += batchSize) {
            const batch = allPlansToInsert.slice(i, i + batchSize);
            await CarInsuranceRate.insertMany(batch);
            
            // แสดง Progress
            const progress = Math.min(((i + batchSize) / allPlansToInsert.length) * 100, 100).toFixed(1);
            console.log(`   Processed: ${i + batch.length} / ${allPlansToInsert.length} (${progress}%)`);
        }

        console.log("🎉 All Done! Database seeded successfully.");
        process.exit();

    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
};

// สั่งรัน
seedDB();