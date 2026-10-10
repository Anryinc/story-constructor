/** Spatial graph + inspect targets for Cherwood (P1). */

export type InspectTarget = {
  id: string;
  label: string;
  result: string;
  clue?: { id: string; title: string; body: string; source: string };
  once?: boolean;
};

export type LocationNode = {
  id: string;
  exits: string[];
  inspect: InspectTarget[];
};

export const CHERWOOD_START_LOCATION = "street";

export const CHERWOOD_MAP: Record<string, LocationNode> = {
  street: {
    id: "street",
    exits: ["parlor"],
    inspect: [
      {
        id: "fog_sign",
        label: "Вывеска пансиона",
        result:
          "«Серебряная чайка» качается на ржавой цепи. Буквы съел туман, но снизу свежий мел: «Комнат нет. Спрашивайте Хэтти».",
        once: true,
      },
      {
        id: "wet_steps",
        label: "Мокрые следы у крыльца",
        result:
          "Следы ведут от мостовой к двери и обрываются: кто-то вытер обувь слишком тщательно — или вовсе не выходил обратно.",
        clue: {
          id: "wet_steps",
          title: "Следы у крыльца",
          body: "Мокрые отпечатки к двери пансиона, обратных нет.",
          source: "Улица",
        },
        once: true,
      },
    ],
  },
  parlor: {
    id: "parlor",
    exits: ["street", "hallway", "basement"],
    inspect: [
      {
        id: "register",
        label: "Реестр гостей",
        result:
          "Книга на стойке. Имена Восс, Пелл, Миллс. Край страницы липкий — будто его трогали мокрыми пальцами. Нужен другой свет, чтобы увидеть скрытое.",
        clue: {
          id: "register_edge",
          title: "Край реестра",
          body: "В книге жильцов след влаги. Обычная лампа врёт.",
          source: "Гостиная",
        },
        once: true,
      },
      {
        id: "hearth",
        label: "Камин",
        result: "В золе — обгоревший обрывок расписания. Слово «пятница» ещё читается.",
        clue: {
          id: "friday_ash",
          title: "Пятница в золе",
          body: "Обгоревшее расписание: пятница.",
          source: "Гостиная",
        },
        once: true,
      },
    ],
  },
  hallway: {
    id: "hallway",
    exits: ["parlor", "room7"],
    inspect: [
      {
        id: "door_marks",
        label: "Царапины на косяке",
        result:
          "У комнаты 7 косяк исчерчен изнутри. Кто-то считал ночи — или ждал сигнала.",
        clue: {
          id: "door7_marks",
          title: "Царапины у комнаты 7",
          body: "Счёт на косяке изнутри.",
          source: "Коридор",
        },
        once: true,
      },
    ],
  },
  room7: {
    id: "room7",
    exits: ["hallway"],
    inspect: [
      {
        id: "desk",
        label: "Письменный стол",
        result:
          "Ящик поддет. Внутри — пустой флакон с запахом соли и сырой бумаги. Этикетка сорвана.",
        clue: {
          id: "salt_vial",
          title: "Соляной флакон",
          body: "Пустой флакон: соль и сырая бумага. Этикетки нет.",
          source: "Комната 7",
        },
        once: true,
      },
      {
        id: "window",
        label: "Окно во двор",
        result:
          "Со двора на стекле — отпечаток ладони снаружи, слишком высоко для прохожего.",
        once: true,
      },
    ],
  },
  basement: {
    id: "basement",
    exits: ["parlor"],
    inspect: [
      {
        id: "door_lock",
        label: "Замок подвальной двери",
        result:
          "Замок не заперт — его держат с той стороны. С щели тянет холодом и запахом мокрого камня.",
        clue: {
          id: "basement_held",
          title: "Дверь держат изнутри",
          body: "Подвальный замок свободен, но полотно удерживают с той стороны.",
          source: "Подвал",
        },
        once: true,
      },
    ],
  },
};
