// Jira wiki emoticons offered in the settings dropdowns. A native select
// option holds plain text only, so each name says what the icon is and
// carries its markup; jiraIconPreview.ts draws the icon beside the menu.
export const calloutIcons: { [key: string]: { displayName: string, jiraTag: string } } = {
    empty: {
        displayName: "None",
        jiraTag: "none",
    },
    check: {
        displayName: "Green tick (/)",
        jiraTag: "(/)",
    },
    cross: {
        displayName: "Red cross (x)",
        jiraTag: "(x)",
    },
    lightBulbOn: {
        displayName: "Light bulb, lit (on)",
        jiraTag: "(on)",
    },
    lightBulbOff: {
        displayName: "Light bulb, unlit (off)",
        jiraTag: "(off)",
    },
    blueStar: {
        displayName: "Blue star (*b)",
        jiraTag: "(*b)",
    },
    yellowStar: {
        displayName: "Yellow star (*y)",
        jiraTag: "(*y)",
    },
    redStar: {
        displayName: "Red star (*r)",
        jiraTag: "(*r)",
    },
    greenStar: {
        displayName: "Green star (*g)",
        jiraTag: "(*g)",
    },
    goldStar: {
        displayName: "Gold star (*)",
        jiraTag: "(*)",
    },
    info: {
        displayName: "Info (i)",
        jiraTag: "(i)",
    },
    warn: {
        displayName: "Warning (!)",
        jiraTag: "(!)",
    },
    question: {
        displayName: "Question (?)",
        jiraTag: "(?)",
    },
    plus: {
        displayName: "Plus (+)",
        jiraTag: "(+)",
    },
    minus: {
        displayName: "Minus (-)",
        jiraTag: "(-)",
    },
    redFlag: {
        displayName: "Red flag (flag)",
        jiraTag: "(flag)",
    },
    whiteFlag: {
        displayName: "Flag, cleared (flagoff)",
        jiraTag: "(flagoff)",
    },
    thumbUp: {
        displayName: "Thumbs up (y)",
        jiraTag: "(y)",
    },
    thumbDown: {
        displayName: "Thumbs down (n)",
        jiraTag: "(n)",
    },
    smile: {
        displayName: "Smile :)",
        jiraTag: ":)",
    },
    sad: {
        displayName: "Sad :(",
        jiraTag: ":(",
    },
    tongue: {
        displayName: "Tongue :P",
        jiraTag: ":P",
    },
    grinning: {
        displayName: "Grin :D",
        jiraTag: ":D",
    },
    winking: {
        displayName: "Wink ;)",
        jiraTag: ";)",
    },
};
