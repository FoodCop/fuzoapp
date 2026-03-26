import { ScoutPlace } from '../types/scoutUi';

export const SCOUT_FALLBACK_PLACES: ScoutPlace[] = [
  { 
    id: 'p1', 
    name: "Oretta Toronto", 
    cat: "High Italian", 
    rating: 4.8, 
    reviews: 1240,
    address: "633 King St W, Toronto, ON",
    phone: "+1 416-944-1932",
    website: "oretta.to",
    vibe: ["Chic", "Lively", "Art Deco"],
    img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
    lat: 43.644, lng: -79.4,
    timings: {
      mon: "11:30 AM - 10:00 PM",
      tue: "11:30 AM - 10:00 PM",
      wed: "11:30 AM - 10:00 PM",
      thu: "11:30 AM - 11:00 PM",
      fri: "11:30 AM - 11:00 PM",
      sat: "10:00 AM - 11:00 PM",
      sun: "10:00 AM - 10:00 PM"
    },
    menu: [
      { section: "Antipasti", items: ["Burrata - $22", "Calamari Fritti - $19", "Polpette - $18"] },
      { section: "Primi", items: ["Rigatoni alla Norma - $26", "Spaghetti Carbonara - $28", "Lasagna Bianca - $30"] }
    ],
    userReviews: [
      { user: "Alex R.", rating: 5, text: "Incredible atmosphere and even better food. The rigatoni is a must-try!" },
      { user: "Jamie L.", rating: 4, text: "Great for a night out. A bit loud but the service was top-notch." }
    ],
    photos: [
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=400",
      "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=400",
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=400"
    ]
  },
  { 
    id: 'p2', 
    name: "Kōjin Steak", 
    cat: "Fire Hearth", 
    rating: 4.6, 
    reviews: 850,
    address: "190 University Ave, Toronto, ON",
    phone: "+1 647-253-8000",
    website: "kojin.momofuku.com",
    vibe: ["Rustic", "Upscale", "Smoky"],
    img: "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=800&q=80",
    lat: 43.649, lng: -79.385,
    timings: {
      mon: "5:00 PM - 10:00 PM",
      tue: "5:00 PM - 10:00 PM",
      wed: "5:00 PM - 10:00 PM",
      thu: "5:00 PM - 11:00 PM",
      fri: "5:00 PM - 11:00 PM",
      sat: "5:00 PM - 11:00 PM",
      sun: "Closed"
    },
    menu: [
      { section: "From the Hearth", items: ["Prime Rib - $65", "Whole Trout - $48", "Roasted Squash - $24"] }
    ],
    userReviews: [
      { user: "Sarah M.", rating: 5, text: "The smoky flavor in everything is just perfect. Best steak in the city." }
    ],
    photos: [
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400",
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=400"
    ]
  },
  { 
    id: 'p3', 
    name: "Zen Garden", 
    cat: "Botanical Bar", 
    rating: 4.9, 
    reviews: 2100,
    address: "123 Queen St W, Toronto, ON",
    phone: "+1 416-555-0199",
    website: "zengarden.to",
    vibe: ["Serene", "Organic", "Minimalist"],
    img: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80",
    lat: 43.651, lng: -79.383,
    timings: {
      mon: "10:00 AM - 8:00 PM",
      tue: "10:00 AM - 8:00 PM",
      wed: "10:00 AM - 8:00 PM",
      thu: "10:00 AM - 10:00 PM",
      fri: "10:00 AM - 10:00 PM",
      sat: "9:00 AM - 10:00 PM",
      sun: "9:00 AM - 8:00 PM"
    },
    menu: [
      { section: "Botanical Cocktails", items: ["Lavender Gin Fizz - $16", "Rosemary Old Fashioned - $18"] },
      { section: "Small Plates", items: ["Truffle Edamame - $12", "Miso Glazed Carrots - $14"] }
    ],
    userReviews: [
      { user: "Michael K.", rating: 5, text: "A literal oasis in the middle of downtown. The cocktails are works of art." }
    ],
    photos: [
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400",
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400"
    ]
  },
];
