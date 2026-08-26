/*
 * The review screenshots under public/reviews/ — real WhatsApp and Instagram
 * chats, exported by scripts/import-reviews.mjs. Names and numbers are
 * scribbled out in the images themselves; anything showing a credential or a
 * customer handle never makes it into the folder.
 *
 * Every screenshot is the same shape — an iPhone screen — so layouts can
 * assume the 1170×2532 ratio.
 */

export type Review = {
  src: string;
  /* What the chat shows, for screen readers and broken loads. */
  alt: string;
};

const review = (id: number, alt: string): Review => ({
  src: `/reviews/review-${id}.webp`,
  alt,
});

/* Ordered strongest first: explicit praise up top, plain "thanks" later.
   The homepage strip shows the head of this list; /reviews shows all of it. */
export const REVIEWS: Review[] = [
  review(2770, "WhatsApp chat — “The game is working perfectly. Thank you to the seller for the fast and authentic service. Highly recommended!”"),
  review(2615, "WhatsApp chat — WWE 2K24 running, “Game Is Completely Working … Will recommend you to my friends as well”"),
  review(2645, "Instagram chat — Kingdom Come: Deliverance II running, “Its working fine… u are a live saver… Highly appreciated”"),
  review(2614, "Instagram chat — GTA V Enhanced installed, “Bought second game from you, smooth experience”"),
  review(2618, "Instagram chat — “Like always working without any issues. Thank u Cheappcgames”"),
  review(2653, "WhatsApp chat — Pragmata running, “jazakallah for the amazing service”"),
  review(2585, "Instagram chat — Cyberpunk 2077: Phantom Liberty running, “The game is working fine bro”"),
  review(2596, "Instagram chat — Black Myth: Wukong running, “Its working fine”"),
  review(2649, "Instagram chat — EA FC 26 title screen, “Thanks bro” with a fire reaction"),
  review(2552, "WhatsApp chat — Assassin's Creed Shadows running, “Working as always brother thanks”"),
  review(2774, "WhatsApp chat — Forza Horizon 6 on Game Pass, “thank you so much, will reccomend to my friends”"),
  review(2402, "WhatsApp chat — Red Dead Redemption 2 in the Steam library, “Done!!”"),
  review(2561, "WhatsApp chat — WWE 2K25 home screen, “Thank you bai” with heart emojis"),
  review(2563, "Instagram chat — WWE 2K26 title screen, “Zalim game” with a fire emoji"),
  review(2611, "Instagram chat — Marvel's Spider-Man 2 in the Steam library, “Got it. Thanks”"),
  review(2654, "Instagram chat — GTA V gameplay, “Working Amazing Thank you Bro. Appreciate Your Work”"),
  review(2657, "Instagram chat — Black Myth: Wukong gameplay, “Running as always”"),
  review(2616, "Instagram chat — “Worked lol … rep ++ game works thanks alot”"),
  review(2587, "Instagram chat — Crimson Desert title screen after activation"),
  review(2588, "Instagram chat — Crimson Desert loading, “Awesome” with a thumbs up"),
  review(2592, "Instagram chat — Crimson Desert installing, “Logged in thanks.”"),
  review(2401, "Instagram chat — EA FC 26 running on a customer's PC, “Thanks for purchasing”"),
  review(2444, "Instagram chat — EA FC running, “Game is working. Thankyou” with thumbs up"),
  review(2482, "WhatsApp chat — Mafia: The Old Country running, “Thank you very much bro. The game is working”"),
  review(2526, "WhatsApp chat — Hitman running, “done”"),
  review(2536, "WhatsApp chat — God of War Ragnarök running, “done”"),
  review(2545, "Chat — game delivered and offline mode set up, “Like always working like a charm”"),
  review(2548, "Chat — Resident Evil Requiem running, “It's working brother Thanks”"),
  review(2549, "Instagram chat — Resident Evil Requiem running after the activation steps, “the game is working” with a green check"),
  review(2655, "WhatsApp chat — Pragmata downloading, “I'ma write a good message under the Instagram reel”"),
  review(2733, "WhatsApp chat — 007 First Light downloading after the activation steps, “Thank u” with a heart"),
  review(2735, "WhatsApp chat — 007 First Light with all DLC, “Thanks boss”"),
  review(2736, "WhatsApp chat — 007 First Light downloading, “Thanks”"),
  review(2738, "WhatsApp chat — Resident Evil Requiem downloading, “Ok boss”"),
  review(2772, "WhatsApp chat — 007 First Light gameplay screenshots from a happy buyer"),
  review(2775, "WhatsApp chat — 007 First Light preloading, “Thanks boss”"),
];

export const FEATURED_REVIEWS = REVIEWS.slice(0, 12);
