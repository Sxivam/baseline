// Per-marker awareness content. Used on /tests (when a marker is selected)
// and on the dashboard's expandable "Other markers" row (what it is, why a
// non-in-range reading might matter, and the natural levers). Plain-English,
// §7-safe one-liners; frequencies are commonly cited guidance, not
// personalised medical advice.

export interface MarkerEducation {
  frequency: string;
  /** Short definition — what the marker actually represents. */
  whatItTellsYou: string;
  /** One sentence on why a low / off-range reading is worth paying attention to.
   *  Frames the consequence in felt terms, not clinical jargon. */
  whyItMatters: string;
  /** Three to four short, repeatable actions a person can take this week.
   *  Behavioural only — food, sun, sleep, movement. No doses, no pills. */
  naturalLevers: string[];
}

export const EDUCATION: Record<string, MarkerEducation> = {
  vitamin_d: {
    frequency: "Every 6 months if low; annually if in range.",
    whatItTellsYou:
      "Your body's vitamin D stores. Drops in low-sun months and on plant-heavy diets.",
    whyItMatters:
      "Low D shows up as a flat mood, low energy, and quietly thinner bones over years. The body doesn't shout — the dip just stretches longer.",
    naturalLevers: [
      "15 to 20 minutes of morning sun on most days, arms exposed.",
      "Eggs at breakfast and fortified milk, if you eat them.",
      "Fatty fish (salmon, sardines, mackerel) twice a week.",
      "Mushrooms cooked sunny-side for a plant-based D source.",
    ],
  },
  vitamin_b12: {
    frequency: "Every 6 months on plant-leaning diets; annually otherwise.",
    whatItTellsYou:
      "Circulating B12. Key for nerves, blood, and energy. Drifts down quietly over months.",
    whyItMatters:
      "Low B12 shows up as brain fog, tingling fingers, and a fatigue that food alone can't fix. Veg and vegan diets pull it down most predictably.",
    naturalLevers: [
      "Eggs and dairy daily if you eat them.",
      "Fortified breakfast cereals or fortified plant milk.",
      "Nutritional yeast on rice, pasta, or popcorn.",
      "Fish or meat across the week if non-veg.",
    ],
  },
  ferritin: {
    frequency: "Annually; every 6 months if low.",
    whatItTellsYou:
      "Your iron stores. Drops before clinical anaemia shows up. An early signal.",
    whyItMatters:
      "Low iron stores show up as breathlessness on stairs, cold hands, hair thinning, and dragging energy. Common in women, vegetarians, and frequent blood donors.",
    naturalLevers: [
      "Pair iron meals with vitamin C — squeeze lemon, eat amla or citrus.",
      "Keep chai and coffee at least an hour away from food.",
      "Rotate rajma, spinach, dates, jaggery, fortified atta.",
      "Red meat or organ meats weekly if non-veg.",
    ],
  },
  ldl: {
    frequency: "Annually; sooner with family history.",
    whatItTellsYou:
      "The cholesterol that builds up in arteries over years. Diet and cardio are the levers.",
    whyItMatters:
      "High LDL doesn't feel like anything for years. It is the slow-build risk factor for heart disease and stroke, the long-game one.",
    naturalLevers: [
      "Olive or cold-pressed oil for cold uses, save ghee for warmth.",
      "Four 30-minute cardio sessions a week (walks, cycle, swim).",
      "Daily handful of nuts as the default snack.",
      "Fatty fish twice a week, or flax and walnuts for veg.",
    ],
  },
  hdl: {
    frequency: "Annually.",
    whatItTellsYou:
      "Protective cholesterol. Moves LDL out. Higher is better.",
    whyItMatters:
      "Low HDL means the body's cleanup of arterial cholesterol is sluggish. The risk shows up decades out, not next month.",
    naturalLevers: [
      "Consistent cardio four times a week — it lifts HDL more than diet.",
      "Olive oil, nuts, fatty fish for the right fats.",
      "Cut down on deep-fried food and refined carbs.",
      "Sleep 7+ hours; under-sleeping suppresses HDL.",
    ],
  },
  hba1c: {
    frequency: "Every 6 months; annually if comfortably normal.",
    whatItTellsYou:
      "Average blood sugar over the last 3 months. An earlier signal than fasting glucose.",
    whyItMatters:
      "Rising HbA1c means insulin sensitivity is slowly slipping. Years before diabetes shows up clinically, this number is already moving.",
    naturalLevers: [
      "Protein and veg first at every meal, carbs second.",
      "10-minute walk after dinner, every day.",
      "Whole grains over refined; halve the white rice and maida.",
      "7+ hours of sleep — sleep debt spikes blood sugar.",
    ],
  },
  fasting_glucose: {
    frequency: "Annually, paired with HbA1c.",
    whatItTellsYou:
      "Blood sugar after an overnight fast. Pairs with HbA1c for the metabolic picture.",
    whyItMatters:
      "Climbing fasting glucose means your body isn't clearing sugar overnight. Often the first marker to drift in the diabetes arc.",
    naturalLevers: [
      "Lighter, earlier dinners; nothing heavy after 9 PM.",
      "Walk for 10 minutes after dinner.",
      "Cut sugary drinks — that includes juice and sweetened chai.",
      "Sleep before midnight on most days.",
    ],
  },
  tsh: {
    frequency: "Every 1 to 2 years; sooner with symptoms or family history.",
    whatItTellsYou:
      "How hard your pituitary is pushing the thyroid. The first hormone to flag thyroid drift.",
    whyItMatters:
      "TSH outside the typical range usually points to under- or over-active thyroid. Shows up as energy swings, weight changes, mood shifts, and temperature sensitivity.",
    naturalLevers: [
      "Iodised salt for cooking (most Indian households already do).",
      "1 to 2 Brazil nuts a day for selenium.",
      "10 minutes of slow breathing daily — stress moves thyroid signalling.",
      "Sleep before midnight; thyroid recovers at night.",
    ],
  },
};
