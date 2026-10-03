require("dotenv").config();
const mongoose = require("mongoose");

const User = require("./models/user.model");
const Category = require("./models/category.model");
const Product = require("./models/product.model");

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // ── 1. Admin ───────────────────────────────────────────
    await User.deleteOne({ email: "process.env.ADMIN_EMAIL" });
    await User.create({
      name: "TrendFusion Admin",
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: "admin",
      isActive: true,
    });
    console.log("✅ Admin ready");

    // ── 2. Categories (matching frontend filter values exactly) ─
    const catData = [
      { name: "Dresses",     slug: "dresses",     description: "Dresses collection",   isActive: true },
      { name: "Tops",        slug: "tops",         description: "Tops collection",       isActive: true },
      { name: "Bottoms",     slug: "bottoms",      description: "Bottoms collection",    isActive: true },
      { name: "Outerwear",   slug: "outerwear",    description: "Outerwear collection",  isActive: true },
      { name: "Accessories", slug: "accessories",  description: "Accessories collection",isActive: true },
    ];

    const cats = {};
    for (const c of catData) {
      await Category.deleteOne({ slug: c.slug });
      const cat = await Category.create(c);
      cats[c.slug] = cat._id;
      console.log(`✅ Category: ${c.name}`);
    }

    // ── 3. Products ────────────────────────────────────────
    await Product.deleteMany({});
    console.log("🗑️  Old products cleared");

    const products = [
      {
        name: "Floral Wrap Dress",
        slug: "floral-wrap-dress",
        description: "A beautiful floral wrap dress perfect for any occasion. Light, breezy fabric with a flattering silhouette.",
        shortDescription: "Breezy floral wrap dress",
        price: 1799, compareAtPrice: 2499,
        category: cats["dresses"], tags: ["dress","floral","summer"], badge: "New", isActive: true,
        images: [{ url: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80", publicId: "floral-dress-1", alt: "Floral Wrap Dress", isPrimary: true }],
        variants: [
          { size: "XS", color: "Pink", colorHex: "#ff6b9d", stock: 6,  sku: "FWD-XS-001" },
          { size: "S",  color: "Pink", colorHex: "#ff6b9d", stock: 12, sku: "FWD-S-001"  },
          { size: "M",  color: "Pink", colorHex: "#ff6b9d", stock: 9,  sku: "FWD-M-001"  },
          { size: "L",  color: "Pink", colorHex: "#ff6b9d", stock: 5,  sku: "FWD-L-001"  },
        ],
      },
      {
        name: "Ethnic Kurta Dress",
        slug: "ethnic-kurta-dress",
        description: "Elegant ethnic kurta dress with intricate embroidery. Perfect for festivals and special occasions.",
        shortDescription: "Embroidered ethnic dress",
        price: 2999, compareAtPrice: 4500,
        category: cats["dresses"], tags: ["ethnic","kurta","festival"], badge: "Sale", isActive: true,
        images: [{ url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80", publicId: "kurta-dress-1", alt: "Ethnic Kurta Dress", isPrimary: true }],
        variants: [
          { size: "S", color: "Maroon", colorHex: "#800000", stock: 5, sku: "EKD-S-001" },
          { size: "M", color: "Maroon", colorHex: "#800000", stock: 8, sku: "EKD-M-001" },
          { size: "L", color: "Maroon", colorHex: "#800000", stock: 4, sku: "EKD-L-001" },
        ],
      },
      {
        name: "Classic White Shirt",
        slug: "classic-white-shirt",
        description: "A timeless white shirt for every occasion. Made with premium cotton for all-day comfort.",
        shortDescription: "Premium cotton white shirt",
        price: 1299, compareAtPrice: 1999,
        category: cats["tops"], tags: ["shirt","casual","formal"], badge: "Sale", isActive: true,
        images: [{ url: "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=600&q=80", publicId: "white-shirt-1", alt: "Classic White Shirt", isPrimary: true }],
        variants: [
          { size: "S",  color: "White", colorHex: "#ffffff", stock: 10, sku: "CWS-S-001"  },
          { size: "M",  color: "White", colorHex: "#ffffff", stock: 15, sku: "CWS-M-001"  },
          { size: "L",  color: "White", colorHex: "#ffffff", stock: 8,  sku: "CWS-L-001"  },
          { size: "XL", color: "White", colorHex: "#ffffff", stock: 5,  sku: "CWS-XL-001" },
        ],
      },
      {
        name: "Oversized Graphic Tee",
        slug: "oversized-graphic-tee",
        description: "Trendy oversized graphic tee with unique print. Soft cotton blend for all-day comfort.",
        shortDescription: "Trendy oversized graphic tee",
        price: 799, compareAtPrice: 1299,
        category: cats["tops"], tags: ["tshirt","casual","graphic"], badge: "Trending", isActive: true,
        images: [{ url: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80", publicId: "graphic-tee-1", alt: "Oversized Graphic Tee", isPrimary: true }],
        variants: [
          { size: "S",  color: "Black", colorHex: "#000000", stock: 20, sku: "OGT-S-001"  },
          { size: "M",  color: "Black", colorHex: "#000000", stock: 18, sku: "OGT-M-001"  },
          { size: "L",  color: "Black", colorHex: "#000000", stock: 15, sku: "OGT-L-001"  },
          { size: "XL", color: "Black", colorHex: "#000000", stock: 10, sku: "OGT-XL-001" },
        ],
      },
      {
        name: "Slim Fit Denim Jeans",
        slug: "slim-fit-denim-jeans",
        description: "Classic slim fit denim jeans with a modern cut. Versatile for casual and semi-formal looks.",
        shortDescription: "Modern slim fit denim",
        price: 2199, compareAtPrice: 3499,
        category: cats["bottoms"], tags: ["jeans","denim","casual"], badge: "Trending", isActive: true,
        images: [{ url: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80", publicId: "denim-jeans-1", alt: "Slim Fit Denim Jeans", isPrimary: true }],
        variants: [
          { size: "28", color: "Blue", colorHex: "#1a4f7a", stock: 8,  sku: "SFJ-28-001" },
          { size: "30", color: "Blue", colorHex: "#1a4f7a", stock: 10, sku: "SFJ-30-001" },
          { size: "32", color: "Blue", colorHex: "#1a4f7a", stock: 14, sku: "SFJ-32-001" },
          { size: "34", color: "Blue", colorHex: "#1a4f7a", stock: 7,  sku: "SFJ-34-001" },
        ],
      },
      {
        name: "High Waist Trousers",
        slug: "high-waist-trousers",
        description: "Elegant high waist trousers with a straight leg cut. Perfect for office and casual wear.",
        shortDescription: "Elegant high waist trousers",
        price: 1599, compareAtPrice: 2299,
        category: cats["bottoms"], tags: ["trousers","formal","office"], badge: "New", isActive: true,
        images: [{ url: "https://images.unsplash.com/photo-1594938298603-c8148c4b4357?w=600&q=80", publicId: "trousers-1", alt: "High Waist Trousers", isPrimary: true }],
        variants: [
          { size: "S",  color: "Beige", colorHex: "#d4b896", stock: 8,  sku: "HWT-S-001"  },
          { size: "M",  color: "Beige", colorHex: "#d4b896", stock: 12, sku: "HWT-M-001"  },
          { size: "L",  color: "Beige", colorHex: "#d4b896", stock: 6,  sku: "HWT-L-001"  },
        ],
      },
      {
        name: "Oversized Hoodie",
        slug: "oversized-hoodie",
        description: "Cozy oversized hoodie for those chilly days. Soft fleece interior with a relaxed fit.",
        shortDescription: "Cozy fleece oversized hoodie",
        price: 1899, compareAtPrice: 2699,
        category: cats["outerwear"], tags: ["hoodie","winter","casual"], badge: "Trending", isActive: true,
        images: [{ url: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&q=80", publicId: "hoodie-1", alt: "Oversized Hoodie", isPrimary: true }],
        variants: [
          { size: "S",  color: "Grey", colorHex: "#9ca3af", stock: 8,  sku: "OH-S-001"  },
          { size: "M",  color: "Grey", colorHex: "#9ca3af", stock: 12, sku: "OH-M-001"  },
          { size: "L",  color: "Grey", colorHex: "#9ca3af", stock: 10, sku: "OH-L-001"  },
          { size: "XL", color: "Grey", colorHex: "#9ca3af", stock: 6,  sku: "OH-XL-001" },
        ],
      },
      {
        name: "Quilted Puffer Jacket",
        slug: "quilted-puffer-jacket",
        description: "Warm and stylish quilted puffer jacket. Lightweight yet incredibly warm for winter.",
        shortDescription: "Lightweight quilted puffer",
        price: 3499, compareAtPrice: 4999,
        category: cats["outerwear"], tags: ["jacket","winter","puffer"], badge: "Sale", isActive: true,
        images: [{ url: "https://images.unsplash.com/photo-1547949003-9792a18a2601?w=600&q=80", publicId: "puffer-1", alt: "Quilted Puffer Jacket", isPrimary: true }],
        variants: [
          { size: "S",  color: "Black", colorHex: "#000000", stock: 5,  sku: "QPJ-S-001"  },
          { size: "M",  color: "Black", colorHex: "#000000", stock: 8,  sku: "QPJ-M-001"  },
          { size: "L",  color: "Black", colorHex: "#000000", stock: 6,  sku: "QPJ-L-001"  },
          { size: "XL", color: "Black", colorHex: "#000000", stock: 4,  sku: "QPJ-XL-001" },
        ],
      },
      {
        name: "Leather Tote Bag",
        slug: "leather-tote-bag",
        description: "Premium faux leather tote bag with spacious compartments. Perfect for work and everyday use.",
        shortDescription: "Premium faux leather tote",
        price: 1299, compareAtPrice: 1999,
        category: cats["accessories"], tags: ["bag","tote","leather"], badge: "New", isActive: true,
        images: [{ url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80", publicId: "tote-bag-1", alt: "Leather Tote Bag", isPrimary: true }],
        variants: [
          { size: "One Size", color: "Brown", colorHex: "#795548", stock: 15, sku: "LTB-OS-001" },
          { size: "One Size", color: "Black", colorHex: "#000000", stock: 12, sku: "LTB-OS-002" },
        ],
      },
      {
        name: "Gold Hoop Earrings",
        slug: "gold-hoop-earrings",
        description: "Classic gold hoop earrings that go with everything. Lightweight and hypoallergenic.",
        shortDescription: "Classic gold hoop earrings",
        price: 499, compareAtPrice: 799,
        category: cats["accessories"], tags: ["earrings","gold","jewelry"], badge: "Sale", isActive: true,
        images: [{ url: "https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=600&q=80", publicId: "hoops-1", alt: "Gold Hoop Earrings", isPrimary: true }],
        variants: [
          { size: "Small",  color: "Gold", colorHex: "#FFD700", stock: 25, sku: "GHE-S-001" },
          { size: "Medium", color: "Gold", colorHex: "#FFD700", stock: 20, sku: "GHE-M-001" },
          { size: "Large",  color: "Gold", colorHex: "#FFD700", stock: 15, sku: "GHE-L-001" },
        ],
      },
    ];

    for (const p of products) {
      await Product.create(p);
      console.log(`✅ Product: ${p.name}`);
    }

    console.log("\n🎉 Seed complete!");
    console.log("   Admin: admin@trendfusion.com / Admin@1234");
    console.log(`   ${products.length} products added across 5 categories`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
};

seed();
