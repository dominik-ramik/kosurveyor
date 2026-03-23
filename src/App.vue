<template>
  <v-app>
    <v-app-bar color="primary" elevation="2">
      <v-app-bar-title class="text-h6 d-flex align-center">
        <router-link
          to="/"
          class="d-flex align-center text-decoration-none text-white"
        >
          <img
            src="/kosurveyor-icon.svg"
            alt="KoSurveyor"
            class="mr-2"
            style="width: 28px; height: 28px"
          />
          <span class="brand-font">KoSurveyor</span>
        </router-link>
      </v-app-bar-title>

      <v-spacer></v-spacer>

      <v-tabs v-model="activeTab" align-tabs="end" color="white">
        <v-tab
          value="generate"
          to="/generate"
          class="text-subtitle-1 text-none px-4"
        >
          <v-icon start>mdi-file-document-plus-outline</v-icon>
          Create a survey
        </v-tab>

        <v-tab
          value="postprocess"
          to="/postprocess"
          class="text-subtitle-1 text-none px-4"
        >
          <v-icon start>mdi-database-export-outline</v-icon>
          Package survey data
        </v-tab>
      </v-tabs>
    </v-app-bar>

    <v-main>
      <v-container fluid class="pa-6">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>

        <div v-if="!$route.name || $route.path === '/'" class="mt-8">
          <div class="text-center mb-10">
            <h1
              class="text-h2 text-md-h1 font-weight-bold text-grey-darken-3 mb-4"
            >
              Welcome to
              <span class="text-primary brand-font">KoSurveyor</span
              ><span v-html="typewriterHtml"></span>
            </h1>
            <p class="text-h6 text-grey-darken-1 font-weight-regular">
              <b>From first idea to final dataset:</b> effortlessly build
              surveys from reusable profiles, then download your field results
              as clean spreadsheets bundled with media
            </p>
          </div>

          <v-row justify="center" align="stretch">
            <v-col cols="12" md="4">
              <v-card
                to="/generate"
                hover
                elevation="3"
                class="pa-10 text-center h-100 d-flex flex-column align-center rounded-xl transition-swing"
              >
                <div class="step-badge step-badge--yours mb-6">
                  <span class="step-number">1</span>
                  <span>KoSurveyor</span>
                </div>
                <v-avatar color="primary-lighten-5" size="120" class="mb-6">
                  <v-icon size="64" color="primary"
                    >mdi-file-document-plus-outline</v-icon
                  >
                </v-avatar>
                <h2 class="text-h4 font-weight-bold text-grey-darken-3 mb-4">
                  Create a survey
                </h2>
                <p class="text-body-1 text-grey-darken-1 px-4 flex-grow-1">
                  Build deployment-ready <strong>KoboToolbox</strong> survey
                  forms and accompanying data CSVs directly from your project
                  profiles
                </p>
                <div class="card-nav-hint mt-6">
                  Open <v-icon size="14" class="ml-1">mdi-chevron-right</v-icon>
                </div>
              </v-card>
            </v-col>

            <v-col cols="12" md="4">
              <div
                class="step-middle h-100 d-flex flex-column align-center text-center px-6 py-10"
              >
                <div class="step-badge step-badge--external mb-6">
                  <span class="step-number step-number--muted">2</span>
                  <span>Deploy & collect</span>
                </div>
                <p class="text-body-2 text-medium-emphasis mt-4 mb-2">
                  Deploy the survey on your<br />
                  <strong>KoboToolbox</strong> server
                </p>
                <div
                  id="curly-arrow"
                  class="text-primary brand-font"
                  aria-hidden="true"
                >
                  ⤳
                </div>
                <p class="text-body-2 text-medium-emphasis">
                  Collect data in the field<br />using the
                  <strong>KoboCollect</strong> app
                </p>
              </div>
            </v-col>

            <v-col cols="12" md="4">
              <v-card
                to="/postprocess"
                hover
                elevation="3"
                class="pa-10 text-center h-100 d-flex flex-column align-center rounded-xl transition-swing"
              >
                <div class="step-badge step-badge--yours mb-6">
                  <span class="step-number">3</span>
                  <span>KoSurveyor</span>
                </div>
                <v-avatar color="primary-lighten-5" size="120" class="mb-6">
                  <v-icon size="64" color="primary"
                    >mdi-database-export-outline</v-icon
                  >
                </v-avatar>
                <h2 class="text-h4 font-weight-bold text-grey-darken-3 mb-4">
                  Package survey data
                </h2>
                <p class="text-body-1 text-grey-darken-1 px-4 flex-grow-1">
                  Download and package your collected field data into clean
                  Excel spreadsheets alongside all bundled media attachments
                </p>
                <div class="card-nav-hint mt-6">
                  Open <v-icon size="14" class="ml-1">mdi-chevron-right</v-icon>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </v-container>
    </v-main>

    <v-footer
      app
      color="primary"
      elevation="24"
      height="48"
      class="d-flex align-center justify-center text-white px-4"
    >
      <div class="text-body-small text-truncate text-center w-100">
        <span>Version {{ appVersion }} • </span>
        <span
          >Author:
          <a
            class="text-white text-decoration-none font-weight-bold"
            href="https://dominicweb.eu"
            target="_blank"
            rel="noopener noreferrer"
            >Dominik M. Ramík</a
          >
          •
        </span>
        <span
          >First developed for the research project
          <a
            class="text-white text-decoration-none font-weight-bold"
            href="https://pvnh.net/plants-and-people-of-vanuatu/"
            target="_blank"
            rel="noopener noreferrer"
            >Plants and People of Vanuatu</a
          >
          •
        </span>
        <span
          ><a
            class="text-white text-decoration-none font-weight-bold"
            href="https://github.com/dominik-ramik/kosurveyor"
            target="_blank"
            rel="noopener noreferrer"
            >Source on GitHub</a
          ></span
        >
      </div>
    </v-footer>
  </v-app>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import pkg from "../package.json";

const appVersion = pkg.version;

const activeTab = ref(null);
const guideOpen = ref(false);
const route = useRoute();

// 1. Reactive variable to hold the HTML as it types
const typewriterHtml = ref("");

// 2. The full text we want to type out
const fullText = ", your KoboToolbox survey kompanion";

onMounted(() => {
  // Wait exactly 1 second after the page displays
  setTimeout(() => {
    let i = 0;

    // Fire every 40ms to simulate fast, natural typing
    const interval = setInterval(() => {
      // Index 26 is exactly where the letter "k" in "kompanion" sits.
      if (i === 26) {
        typewriterHtml.value +=
          '<span class="text-primary brand-font">k</span>';
      } else {
        typewriterHtml.value += fullText.charAt(i);
      }

      i++;

      // Stop the interval when we finish the string
      if (i >= fullText.length) {
        clearInterval(interval);
      }
    }, 40);
  }, 1000);
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@800&family=Poppins:wght@700&family=Roboto+Slab:wght@700&family=Space+Grotesk:wght@700&display=swap");

.brand-font {
  font-family: "Space Grotesk", sans-serif !important;
  font-weight: 800;
  letter-spacing: -1px;
}

/* Step badge — shared base */
.step-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px 3px 3px;
  border-radius: 99px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1;
}

.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.6);
}

/* KoSurveyor steps — primary tonal */
.step-badge--yours {
  background: rgb(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
}
.step-badge--yours .step-number {
  background: rgb(var(--v-theme-primary));
  color: #fff;
}

/* External step — neutral muted */
.step-badge--external {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(0, 0, 0, 0.45);
}
.step-number--muted {
  background: rgba(0, 0, 0, 0.15);
  color: rgba(0, 0, 0, 0.5);
}

/* Middle column — dashed container */
.step-middle {
  border: 2px dashed rgba(0, 0, 0, 0.13);
  border-radius: 16px; /* matches rounded-xl on the v-cards */
}

#curly-arrow {
  font-size: 5rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Unobtrusive navigation hint at card bottom */
.card-nav-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-primary), 0.7);
  opacity: 0.55;
  transition: opacity 0.15s ease;
}
.v-card:hover .card-nav-hint {
  opacity: 1;
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
