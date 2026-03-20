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
          Generate a Survey
        </v-tab>

        <v-tab
          value="postprocess"
          to="/postprocess"
          class="text-subtitle-1 text-none px-4"
        >
          <v-icon start>mdi-database-export-outline</v-icon>
          Package Survey Data
        </v-tab>

        <v-tab
          value="guide"
          class="text-subtitle-1 text-none px-4"
          @click.prevent="guideOpen = !guideOpen"
        >
          <v-icon start>mdi-book-open-page-variant-outline</v-icon>
          User Guide
        </v-tab>
      </v-tabs>
    </v-app-bar>

    <!-- ── User Guide drawer (right-side, permanent when open) ── -->
    <v-navigation-drawer v-model="guideOpen" location="right" width="640">
      <div class="pa-4">
        <div class="d-flex align-center mb-4">
          <v-icon color="primary" class="mr-2"
            >mdi-book-open-page-variant-outline</v-icon
          >
          <span class="text-h6 font-weight-bold">User Guide</span>
          <v-spacer />
          <v-btn
            icon
            variant="text"
            density="compact"
            @click="guideOpen = false"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>

        <v-divider class="mb-4" />

        <div class="text-subtitle-2 font-weight-bold text-primary mb-1">
          Getting started
        </div>
        <p class="text-body-2 text-grey-darken-2 mb-4">
          KoSurveyor connects to your KoboToolbox account to help you build
          surveys and export field data. Start by selecting a
          <strong>profile</strong> — a JSON file that describes your survey
          schema.
        </p>

        <div class="text-subtitle-2 font-weight-bold text-primary mb-1">
          Generate a Survey
        </div>
        <p class="text-body-2 text-grey-darken-2 mb-4">
          Pick a profile, configure output options, and click
          <strong>Generate</strong>. KoSurveyor produces a deployment-ready
          XLSForm and optional choice CSVs.
        </p>

        <div class="text-subtitle-2 font-weight-bold text-primary mb-1">
          Package Survey Data
        </div>
        <p class="text-body-2 text-grey-darken-2 mb-4">
          Enter your Kobo credentials, select a form and submission range, then
          click
          <strong>Download &amp; Package</strong> to get a clean Excel file
          bundled with all media attachments.
        </p>

        <v-divider class="mb-4" />
        <p class="text-caption text-grey">
          More detailed documentation coming soon.
        </p>
      </div>
    </v-navigation-drawer>

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
                class="pa-10 text-center h-100 d-flex flex-column align-center justify-center rounded-xl transition-swing"
              >
                <v-avatar color="primary-lighten-5" size="120" class="mb-6">
                  <v-icon size="64" color="primary"
                    >mdi-file-document-plus-outline</v-icon
                  >
                </v-avatar>
                <h2 class="text-h4 font-weight-bold text-grey-darken-3 mb-4">
                  Generate a Survey
                </h2>
                <p class="text-body-1 text-grey-darken-1 px-4">
                  Build deployment-ready KoboToolbox survey forms and structured
                  data CSVs directly from your project profiles
                </p>
              </v-card>
            </v-col>

            <v-col cols="12" md="4">
              <v-card
                to="/postprocess"
                hover
                elevation="3"
                class="pa-10 text-center h-100 d-flex flex-column align-center justify-center rounded-xl transition-swing"
              >
                <v-avatar color="primary-lighten-5" size="120" class="mb-6">
                  <v-icon size="64" color="primary"
                    >mdi-database-export-outline</v-icon
                  >
                </v-avatar>
                <h2 class="text-h4 font-weight-bold text-grey-darken-3 mb-4">
                  Package Survey Data
                </h2>
                <p class="text-body-1 text-grey-darken-1 px-4">
                  Download and package your collected field data into clean
                  Excel spreadsheets alongside all bundled media attachments
                </p>
              </v-card>
            </v-col>

            <v-col cols="12" md="4">
              <v-card
                hover
                elevation="3"
                class="pa-10 text-center h-100 d-flex flex-column align-center justify-center rounded-xl transition-swing"
                style="cursor: pointer"
                @click="guideOpen = !guideOpen"
              >
                <v-avatar color="primary-lighten-5" size="72" class="mb-4">
                  <v-icon size="36" color="primary"
                    >mdi-book-open-page-variant-outline</v-icon
                  >
                </v-avatar>
                <h3 class="text-h5 font-weight-bold text-grey-darken-3 mb-2">
                  User Guide
                </h3>
                <p class="text-body-2 text-grey-darken-1 px-2">
                  Learn how to make the best of this app
                </p>
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
