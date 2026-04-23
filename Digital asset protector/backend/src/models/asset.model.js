// ========== IMPORTS ==========
import mongoose, { Schema } from "mongoose";

// ========== ASSET SCHEMA DEFINITION ==========
// is schema me hum assets ka structure define kr rhe hain jo users upload krenge
// jaise photos, videos, documents - sab kuch asset h

const assetSchema = new Schema(
    {
        // ========== ASSET INFORMATION ==========
        // yahan asset ka basic information likha h - naam, description aur details

        title: {
            type: String,
            required: true,
            trim: true,
            index: true,
            // index: true iska matlab h - agr kisi ko title se search krna ho to database jaldi search kr sake
            // jaise jab user "GuardMark logo" likhe aur hume search krni ho to index se fast ho jayegi
        },

        description: {
            type: String,
            trim: true,
            // description optional h - user chahta h likhe nhi to na likhe
        },

        // ========== FILE INFORMATION ==========
        // yahan file ke baare me information likha h - URL, type, size, aur hash

        fileUrl: {
            type: String,
            required: true,
            // fileUrl Cloudinary se aayega jo publicly accessible hoga
            // jab user asset upload krega to Cloudinary pe store hoga aur URL milega
        },

        fileHash: {
            type: String,
            required: true,
            unique: true,
            index: true,
            // fileHash ek unique fingerprint h har file ka - cryptographic hash
            // ye same file ko do jagah upload krne se detect kr payengi duplicates
            // unique: true iska matlab h - har file ke liye hash alag hona chahiye
            // index: true iska matlab h - jab detection system koii file match kre to jaldi search ho ske
        },

        fileType: {
            type: String,
            enum: ["image", "video", "document", "audio"],
            required: true,
            // enum matlab - sirf yeh 4 types allowed hain kuch aur nahi
            // agar koi aur type dalne ki koshish kre to error aayega
        },

        fileSize: {
            type: Number,
            required: true,
            // bytes me size store hoga example: 5241880 bytes = 5MB
        },

        // ========== OWNERSHIP & RELATIONSHIPS ==========
        // yahan likha h ki ye asset kisne upload kiya aur uske detections

        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
            // owner = jis user ne ye asset upload kiya h uska ID
            // ref: "User" iska matlab h - User model ko reference kr rhe h (relationship banai h)
            // required: true - har asset ke liye owner jaruri h
            // index: true - agr kisi user ke assets find krne ho to jaldi khoj payenge
        },

        detections: {
            type: [Schema.Types.ObjectId],
            ref: "Detection",
            // detections = array of Detection model references
            // jab bhi ye asset kisi aur jagah detect ho tab Detection model mein entry ban jayegi
            // aur us Detection ki ID yahan store hogi
            // example: detection array mein [65a1b2c3..., 65a1b2c4..., 65a1b2c5...] hongey
        },

        alerts: {
            type: [Schema.Types.ObjectId],
            ref: "Alert",
            // alerts = array of Alert model references
            // jab detection serious violation h tab Alert model mein entry ban jayegi
            // aur Alert ki ID yahan store hogi
        },

        // ========== STATUS & TRACKING ==========
        // yahan likha h asset ki current status - protected h ya flagged (violation h)

        status: {
            type: String,
            enum: ["active", "flagged", "archived", "deleted"],
            default: "active",
            // active = asset normal h safe h
            // flagged = piracy/copyright violation detected h
            // archived = user ne khud se store kiya h active nahi
            // deleted = user ne delete kiya pr data rakhte h recovery ke liye
        },

        isProtected: {
            type: Boolean,
            default: true,
            // isProtected = kya ye asset fingerprinting protection ke tahat h
            // default true iska matlab - jab asset create hoga to automatically protected hoga
        },

        // ========== PLATFORM INFORMATION ==========
        // yahan likha h ki asset ko kaunse platforms pe scan krna h

        platforms: {
            type: [String],
            // example: ["youtube", "instagram", "twitter", "facebook"]
            // array of platforms where ye asset ko scan krna h - kahan dekhna h copyright violation ke liye
            default: ["youtube", "instagram", "twitter", "facebook", "tiktok"],
            // default mein common platforms likhe hain
        },

        // ========== DETECTION TRACKING ==========
        // yahan likha h detection ke liye tracking info

        detectionCount: {
            type: Number,
            default: 0,
            // kitni baar ye asset kisi dusre jagah mila (copyright violation)
            // jab detection hota h to ye number increase hota jata h
        },

        lastDetectedAt: {
            type: Date,
            // aakhri baar ye asset kab detect hua - kaunsi tarikh/time par
            // useful h - use hume batata h ki recent mein scan hua h ya purana scan h
        },

        // ========== TIMESTAMPS ==========
        // automatic timestamps - hum add nahi karte, mongoose automatically add krta h
        uploadDate: {
            type: Date,
            default: Date.now,
            // asset kab upload hua - automatically current time set hota h
            // Date.now iska matlab - aaj ka aaj ka time set hota h upload time par
        },

        // ========== CRICKET ASSET SPECIFIC METADATA ==========
        // cricket player images ke liye specific fields
        
        filename: {
            type: String,
            // original filename - jaise "kohli_1.jpg", "ms_6.jpg"
            // ye unique nahi h kynki same filename alag players ke ho skte hain
        },

        player: {
            type: String,
            index: true,
            // cricket player ka naam jiska image h - jaise "Virat Kohli", "MS Dhoni"
            // index: true taaki player ke naam se search jaldi ho
        },

        action: {
            type: String,
            // cricket action jo image me h - jaise "cover drive", "bowling", "catching"
            // ye field help karega classify krne mein ki kaunsa action h
        },

        source: {
            type: String,
            // image ka original source - jaise "duckduckgo", "google images", "cricket.com"
            // ye track rkhega ki image kahan se download hua tha
        },

        path: {
            type: String,
            // file system path jahan image save h - jaise "images/Virat_Kohli/kohli_1.jpg"
            // ye local file system path h
        },

        hash: {
            type: String,
            // hash field - fileHash ke samaan - ye duplicate detection ke liye use hota h
            // kuch cases mein different hashing algorithms use ho skte hain
        },

        uploadedAt: {
            type: Date,
            // kab ye asset upload hua - separate from uploadDate for clarity
            // Date.now se current date automatically set hota h
            default: Date.now,
        },

        // ========== METADATA ==========
        // extra information jo future mein useful ho sakti h

        metadata: {
            width: Number,
            // image ka width pixels me
            height: Number,
            // image ka height pixels me
            duration: Number,
            // video ki duration seconds me
            format: String,
            // file format - png, jpg, mp4, pdf etc
            resolution: String,
            // image resolution - jaise "1920x1080", "4K"
            colorSpace: String,
            // RGB, CMYK, etc
            bitDepth: Number,
            // 8-bit, 16-bit, 32-bit
        },

        tags: [String],
        // user jo custom tags lga sakta h better searching ke liye
        // example: ["logo", "brand", "official", "art", "cricket", "batting"]
        
        category: {
            type: String,
            enum: ["cricket", "sports", "digital-art", "brand", "photography", "other"],
            default: "cricket",
            // asset ka category - helps in filtering aur organizing
        }
    },
    {
        timestamps: true,
        // automatically createdAt aur updatedAt fields add ho jayenge
        // createdAt = jab asset create hua
        // updatedAt = jab asset last update hua
    }
);

// ========== PRE-SAVE MIDDLEWARE ==========
// jab asset database me save hone vala ho tab ye middleware chale gaa

assetSchema.pre("save", async function (next) {
    // yaha pe koi calculation ya validation kr skte hain save se pehle
    // filhaall hum kuch nahi kr rhe bass next() ko call kr rhe hain
    // agar future me kuch file process krni ho to yaha likhi jayegi

    // console.log("Asset is being saved:", this.title);
    // debug ke liye comment likha h

    next();
    // next() se aage badh jayenga aur save operation complete hoga
});

// ========== CUSTOM METHODS ==========
// ye methods asset ke object par call kr skte hain

assetSchema.methods.toJSON = function () {
    // jab asset JSON format me send krna ho (API response) tab sensible data bhejenge
    // password jaisa sensitive data nahi bhejenge
    const assetObject = this.toObject();
    return assetObject;
};

// ========== INDEXES FOR PERFORMANCE ==========
// indexes create krte hain jisse search jaldi ho jaye

assetSchema.index({ owner: 1, status: 1 });
// user ke assets ko quickly find krnene ke liye
// example: "mera sabhi active assets dikhao" - yeh query fast hogi

assetSchema.index({ fileHash: 1 });
// fileHash se search fast krnee ke liye (duplicate detection)

assetSchema.index({ createdAt: -1 });
// newest assets first dikhane ke liye (-1 matlab descending order)

assetSchema.index({ player: 1 });
// player ke naam se assets search krne ke liye - cricket specific

assetSchema.index({ player: 1, action: 1 });
// player aur action dono se combined search ke liye
// example: "Virat Kohli ke sab cover drives dikhao"

assetSchema.index({ category: 1, status: 1 });
// category aur status ke hisaab se filter krne ke liye

assetSchema.index({ uploadedAt: -1 });
// recently uploaded assets dikhane ke liye

// ========== EXPORT ==========
export const Asset = mongoose.model("Asset", assetSchema);

// Asset model ban gaya ab isko use krke asset create kr skte h database me
// mongoose assetSchema use krke Asset model banaya hai aur usko export kiya hai taaki kahi aur use kr ske
// Mongoose ko bol rahe ho:
// "Is schema ke basis par ek model class bana do jiska naam Asset ho"
// "Asset" model se MongoDB me assets collection ban jaata hai

// Pre-save middleware ek hook h jo save se pehle run hota h
// isme hm file processing, validation, ya koi calculation kr skte hain
// Methods custom functions hote hain jo asset ke instance par call kr skte hain
// Indexes database ke liye optimization h - jisse specific fields par search fast ho jaye
