export const stories = [
  {
    id: 'welcome', title: 'The missing name tag', place: 'At a welcome party',
    intro: 'Ana came to a welcome party. Her name tag was not on the table. Two people were there when she arrived.',
    people: [
      { name: 'Mia', role: 'Guest', voice: 'marin',
        opening: 'I was by the door. Ana said, “Hi, I’m Ana López.” We looked for her name tag. I saw a tag that said “Anna Lopez.” I thought it was hers.',
        details: 'Ana told me she was from Mexico. She said she spoke Spanish and English. The tag with two n’s was next to my tag.' },
      { name: 'Leo', role: 'Party helper', voice: 'cedar',
        opening: 'I was at the table when Ana came in. We looked for her tag. I saw the tag for Anna with two n’s. I thought it was for another guest.',
        details: 'I made tags before the party. I had a new guest list on my phone. Ana’s name was on that list. I wrote a new tag for her.' },
    ],
  },
  {
    id: 'class', title: 'The wrong room', place: 'On the first night of French class',
    intro: 'Luis came to French class. He waited outside Room 12, but his class was in Room 21.',
    people: [
      { name: 'Nora', role: 'Student', voice: 'marin',
        opening: 'I met Luis outside Room 12 at six. He said, “I’m here for French.” He showed me an email with the number 12. I thought he went to the room in his email.',
        details: 'Luis said his last name was Díaz. We were both in French Beginner 1. He told me he signed up last week.' },
      { name: 'Sam', role: 'Front desk worker', voice: 'cedar',
        opening: 'Luis came to my desk from Room 12. He asked where his French class was. I told him it was in Room 21. I thought he saw the old sign by the door.',
        details: 'Room 12 was on the first schedule. The room changed this afternoon. I sent a new email at four. Luis asked me to check his email address.' },
    ],
  },
  {
    id: 'event', title: 'The early guest', place: 'At a community language event',
    intro: 'Kim came to a language event at five. The doors were closed. Two people saw her waiting.',
    people: [
      { name: 'Ava', role: 'Event guest', voice: 'marin',
        opening: 'I saw Kim by the front door at five. She had a card for the event. I saw “5:00” on the card. I thought the event started at five too.',
        details: 'I met Kim in French class. She speaks English and Korean. I could not see the words next to “5:00” on her card.' },
      { name: 'Ben', role: 'Event helper', voice: 'cedar',
        opening: 'I saw Kim at the front door at five. The event started at six. I thought Kim came for the early tour.',
        details: 'The card said “Tour, 5:00” and “Language event, 6:00.” The tour started at the side door. I put a sign at the front door after five.' },
    ],
  },
];
