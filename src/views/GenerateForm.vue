<template>
  <div>
    <div class="d-flex align-center">
      <v-icon size="32" color="primary" class="mr-3"
        >mdi-file-document-plus-outline</v-icon
      >
      <h1 class="text-h4 font-weight-bold text-grey-darken-3">Generate Form</h1>
      <v-spacer />

      <ProfileToolbar
        v-if="profilesStore.activeProfile"
        :is-generating="isGenerating"
        @toggle-generate="isGenerating = !isGenerating"
      />
    </div>

    <ProfileEditor v-if="!isGenerating" />

    <template v-else>
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="8">
            <v-alert
              v-if="!profilesStore.activeProfile"
              type="warning"
              class="mb-4"
            >
              No profile is loaded. Return to the Editor to create or load a
              profile first.
            </v-alert>
            <template v-else>
              <v-alert
                v-if="profilesStore.hasPrefillFields"
                type="info"
                density="compact"
                class="mb-4"
              >
                Your profile is saved. You will need to re-attach your prefill
                data each session.
              </v-alert>

              <v-alert
                v-if="generateStore.obsoleteTemplate"
                type="warning"
                class="mb-4"
              >
                Profile structure has changed. Your previous data template is
                obsolete. Please download a new template, migrate your data, and
                re-upload.
              </v-alert>

              <v-stepper
                :model-value="generateStore.step"
                :items="stepItems"
                alt-labels
                flat
                non-linear
                class="mb-6"
              >
                <template #item.1>
                  <StepTemplateProvision @next="generateStore.step = 2" />
                </template>
                <template #item.2>
                  <StepUploadValidate @next="advanceFromUpload" />
                </template>
                <template #item.3>
                  <StepMediaResolution @next="generateStore.step = 4" />
                </template>
                <template #item.4>
                  <StepGenerateFiles />
                </template>
              </v-stepper>
            </template>
          </v-col>
        </v-row>
      </v-container>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useProfilesStore } from "../stores/profiles.js";
import { useGenerateStore } from "../stores/generate.js";

import ProfileToolbar from "../components/profile/ProfileToolbar.vue"; // Moved import
import ProfileEditor from "../components/profile/ProfileEditor.vue";
import StepTemplateProvision from "../components/generate/StepTemplateProvision.vue";
import StepUploadValidate from "../components/generate/StepUploadValidate.vue";
import StepMediaResolution from "../components/generate/StepMediaResolution.vue";
import StepGenerateFiles from "../components/generate/StepGenerateFiles.vue";

const profilesStore = useProfilesStore();
const generateStore = useGenerateStore();

const isGenerating = ref(false); // Replaces activeSection

const stepItems = [
  { title: "Template", value: 1 },
  { title: "Upload & Validate", value: 2 },
  { title: "Media", value: 3 },
  { title: "Generate", value: 4 },
];

onMounted(() => {
  if (profilesStore.activeProfile) {
    generateStore.initForProfile(profilesStore.activeProfile);
  }
});

function advanceFromUpload() {
  if (generateStore._mediaRequired) {
    generateStore.step = 3;
  } else {
    generateStore.step = 4;
  }
}
</script>
