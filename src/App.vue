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
                class="pa-10 text-center h-100 d-flex flex-column align-center justify-center rounded-xl transition-swing"
              >
                <v-avatar color="primary-lighten-5" size="120" class="mb-6">
                  <v-icon size="64" color="primary"
                    >mdi-file-document-plus-outline</v-icon
                  >
                </v-avatar>
                <h2 class="text-h4 font-weight-bold text-grey-darken-3 mb-4">
                  Create a survey
                </h2>
                <p class="text-body-1 text-grey-darken-1 px-4">
                  Build deployment-ready KoboToolbox survey forms and accompanying
                  data CSVs directly from your project profiles
                </p>
              </v-card>
            </v-col>

            <v-col cols="12" md="4">
              <v-card
                to="NOWHERE"
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
                  Deploy on KoboToolbox and go collecting data
                </h2>
                <p class="text-body-1 text-grey-darken-1 px-4">
                  placeholder text
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
                  Package survey data
                </h2>
                <p class="text-body-1 text-grey-darken-1 px-4">
                  Download and package your collected field data into clean
                  Excel spreadsheets alongside all bundled media attachments
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
