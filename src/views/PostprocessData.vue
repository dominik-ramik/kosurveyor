<template>
  <div>
    <div class="d-flex align-center mb-6">
      <v-icon size="32" color="primary" class="mr-3"
        >mdi-database-export-outline</v-icon
      >
      <h1 class="text-h4 font-weight-bold text-grey-darken-3">
        Package survey data
      </h1>
    </div>

    <v-alert v-if="!extensionDetected" type="warning" class="mb-6">
      The KoSurveyor CORS Companion extension is required for this feature.
      Install it from the Chrome Web Store.
      <template v-slot:append>
        <v-btn
          href="https://chromewebstore.google.com/"
          target="_blank"
          variant="outlined"
          size="small"
        >
          Chrome Web Store
        </v-btn>
      </template>
    </v-alert>

    <template v-if="extensionDetected">
      <v-expansion-panels v-model="connectionPanel" class="mb-6">
        <v-expansion-panel value="connection">
          <v-expansion-panel-title>
            <div class="d-flex align-center flex-grow-1">
              <v-icon size="small" class="mr-2" color="primary"
                >mdi-key-outline</v-icon
              >
              <span class="text-subtitle-1 font-weight-bold">Connection</span>
              <template
                v-if="postprocessStore.selectedAssetUid && selectedFormName"
              >
                <v-chip
                  size="x-small"
                  color="success"
                  variant="tonal"
                  class="ml-3"
                >
                  <v-icon start size="x-small">mdi-check</v-icon>
                  Connected
                </v-chip>
                <span
                  class="text-body-2 text-medium-emphasis ml-2 text-truncate"
                  style="max-width: 300px"
                >
                  {{ selectedFormName }}
                </span>
              </template>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row dense>
              <v-col cols="12" md="4">
                <v-text-field
                  :model-value="credentialsStore.koboUrl || '(not set)'"
                  label="Kobo server URL"
                  variant="solo-filled"
                  density="compact"
                  hide-details
                  readonly
                  append-inner-icon="mdi-pencil-outline"
                  @click:append-inner="openServerDialog"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="credentialsStore.username"
                  label="Username"
                  variant="solo-filled"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="credentialsStore.password"
                  label="Password"
                  type="password"
                  variant="solo-filled"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="2" class="d-flex align-center">
                <v-btn
                  color="primary"
                  block
                  :disabled="postprocessStore.assetsLoading"
                  @click="postprocessStore.loadAssets()"
                >
                  Connect
                </v-btn>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <div class="text-body-small text-medium-emphasis mt-2 mb-0 ml-1 vertical-align-middle d-flex ga-1">
                  <v-icon>mdi-information-outline</v-icon> 
                  <div>Your credentials are only used to establish a connection with KoboToolbox API and are not saved by this application nor the KoSurveyor extension. You will have to re-enter them each time you refresh the page or reopen the application.</div>
                </div>
              </v-col>
            </v-row>

            <v-progress-linear
              v-if="postprocessStore.assetsLoading"
              indeterminate
              class="mt-3"
            />

            <v-alert
              v-if="postprocessStore.assetsError"
              type="error"
              class="mt-3"
            >
              {{ postprocessStore.assetsError }}
            </v-alert>

            <v-select
              v-if="postprocessStore.assets.length > 0"
              :model-value="postprocessStore.selectedAssetUid"
              :items="postprocessStore.assets"
              item-title="name"
              item-value="uid"
              label="Select form"
              variant="solo"
              density="compact"
              hide-details
              class="mt-8"
              @update:model-value="postprocessStore.selectAsset($event)"
            />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <v-card
        v-if="postprocessStore.selectedAssetUid"
        variant="elevated"
        class="pa-4 mb-6"
      >
        <div class="d-flex align-center mb-3">
          <v-icon class="mr-1" color="primary">mdi-clipboard-list-outline</v-icon>
          <span class="text-subtitle-1 font-weight-bold">Submissions</span>
          <v-btn
            icon="mdi-refresh"
            size="small"
            variant="text"
            density="compact"
            class="ml-2"
            :loading="postprocessStore.submissionsLoading"
            :disabled="postprocessStore.submissionsLoading"
            title="Refresh submissions"
            @click="postprocessStore.loadSubmissions()"
          />
        </div>

        <v-progress-linear
          v-if="postprocessStore.submissionsLoading"
          indeterminate
          class="mb-3"
        />

        <v-alert
          v-if="postprocessStore.submissionsError"
          type="error"
          class="mb-3"
        >
          {{ postprocessStore.submissionsError }}
        </v-alert>

        <v-row dense class="mb-3">
          <v-col cols="12" md="3">
            <v-text-field
              v-model="postprocessStore.filterSubmittedBy"
              label="Submitted by"
              variant="solo-filled"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model="postprocessStore.filterDateFrom"
              label="From"
              type="date"
              variant="solo-filled"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model="postprocessStore.filterDateTo"
              label="To"
              type="date"
              variant="solo-filled"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              :model-value="postprocessStore.filterField"
              :items="postprocessStore.availableFields"
              label="Search Field"
              variant="solo-filled"
              density="compact"
              hide-details
              clearable
              :disabled="postprocessStore.submissionsLoading"
              @update:model-value="postprocessStore.setFilterField"
            />
          </v-col>
          <v-col cols="12" md="2">
            <div class="d-flex align-center">
              <v-autocomplete
                v-model="postprocessStore.filterText"
                :items="postprocessStore.fieldValues"
                label="Search"
                variant="solo-filled"
                density="compact"
                hide-details
                clearable
                :disabled="
                  !postprocessStore.filterField ||
                  postprocessStore.isFetchingFieldData
                "
              />
              <v-progress-circular
                v-if="postprocessStore.isFetchingFieldData"
                indeterminate
                size="24"
                width="3"
                color="primary"
                class="ml-2"
              />
            </div>
          </v-col>
        </v-row>

        <v-table density="compact" class="mb-3">
          <thead>
            <tr>
              <th style="width: 48px">
                <v-checkbox-btn
                  :model-value="allFilteredSelected"
                  :indeterminate="someFilteredSelected && !allFilteredSelected"
                  @update:model-value="onToggleAll"
                  density="compact"
                  hide-details
                />
              </th>
              <th>ID</th>
              <th>Submitted at</th>
              <th>Submitted by</th>
              <th v-if="postprocessStore.filterField" class="text-primary">
                {{ postprocessStore.filterField }}
              </th>
              <th>Media</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in paginatedSubmissions" :key="item._id">
              <td>
                <v-checkbox-btn
                  :model-value="postprocessStore.selectedIds.includes(item._id)"
                  @update:model-value="
                    postprocessStore.toggleSelection(item._id)
                  "
                  density="compact"
                  hide-details
                />
              </td>
              <td>{{ item._id }}</td>
              <td>{{ item._submission_time }}</td>
              <td>{{ item._submitted_by }}</td>
              <td v-if="postprocessStore.filterField">
                {{ item[postprocessStore.filterField] ?? "" }}
              </td>
              <td>{{ (item._attachments || []).length || '' }}</td>
            </tr>
          </tbody>
        </v-table>

        <div class="d-flex justify-center mt-2 mb-3">
          <div class="d-flex align-center ga-3 mr-4 ml-2 flex-grow-1">
            <v-btn
              size="small"
              variant="tonal"
              color="primary"
              @click="postprocessStore.selectAllFiltered()"
            >
              Select all filtered
            </v-btn>
            <v-btn
              size="small"
              variant="tonal"
              color="primary"
              @click="postprocessStore.clearSelection()"
            >
              Clear selection
            </v-btn>
          </div>

          <div class="d-flex justify-center mt-2 mb-3">
            <v-pagination
              v-model="page"
              :length="pageCount"
              density="compact"
              :total-visible="7"
            />
          </div>
        </div>

        <v-divider class="my-6" />

        <v-card
          variant="elevated"
          class="bg-grey-lighten-5 border-0 rounded-lg pa-2 mb-4"
        >
          <v-row dense class="align-center">
            <v-col cols="4" md="auto" class="d-flex align-center px-4 py-2">
              <v-switch
                :model-value="postprocessStore.autoDownloadMedia"
                color="primary"
                :label="mediaLabel"
                hide-details
                inset
                density="compact"
                class="flex-grow-0"
                :disabled="postprocessStore.mediaFileCount === 0"
                @update:model-value="postprocessStore.setAutoDownloadMedia"
              />
            </v-col>

            <v-col cols="12" md="auto" class="flex-grow-1">
              <v-btn
                color="primary"
                size="x-large"
                variant="elevated"
                block
                prepend-icon="mdi-package-down"
                :disabled="postprocessStore.selectedCount === 0 || isExporting"
                @click="handleUnifiedExport"
                class="text-none px-8"
              >
                <strong
                  >Export {{ postprocessStore.selectedCount }} selected</strong
                >
              </v-btn>
            </v-col>
          </v-row>
        </v-card>

        <div v-if="postprocessStore.exportState === 'fetching'" class="mt-4">
          <v-progress-linear
            :model-value="
              (postprocessStore.exportProgress.fetched /
                postprocessStore.exportProgress.total) *
              100
            "
            color="primary"
            rounded
            height="8"
          />
          <span
            class="text-body-2 mt-1 d-block text-center text-medium-emphasis"
          >
            Fetching submissions:
            {{ postprocessStore.exportProgress.fetched }} /
            {{ postprocessStore.exportProgress.total }}
          </span>
        </div>

        <div
          v-if="
            postprocessStore.exportState === 'parsing' ||
            postprocessStore.exportState === 'building'
          "
          class="mt-4"
        >
          <v-progress-linear indeterminate color="primary" rounded height="8" />
          <span class="text-body-2 mt-1 d-block">
            {{
              postprocessStore.exportState === "parsing"
                ? "Parsing submissions…"
                : "Building spreadsheet…"
            }}
          </span>
        </div>

        <!-- Unified export progress bar (xlsx + media as one) -->
        <div
          v-if="postprocessStore.exportState === 'done' && postprocessStore.unifiedProgress && !unifiedExportDone"
          class="mt-4"
        >
          <v-progress-linear
            :model-value="(postprocessStore.unifiedProgress.completed / postprocessStore.unifiedProgress.total) * 100"
            color="primary"
            rounded
            height="8"
          />
          <span class="text-body-2 mt-1 d-block text-center text-medium-emphasis">
            <template v-if="postprocessStore.mediaExportState === 'preparing'">
              {{ postprocessStore.exportedFileName }} saved — preparing media download…
            </template>
            <template v-else>
              {{ postprocessStore.unifiedProgress.completed }} / {{ postprocessStore.unifiedProgress.total }} files
              <template v-if="postprocessStore.unifiedProgress.currentFile">
                — {{ postprocessStore.unifiedProgress.currentFile }}
              </template>
              <template v-if="postprocessStore.unifiedProgress.skipped > 0">
                ({{ postprocessStore.unifiedProgress.skipped }} skipped)
              </template>
            </template>
          </span>
        </div>

        <!-- Unified export success -->
        <v-alert
          v-if="postprocessStore.exportState === 'done' && unifiedExportDone"
          type="success"
          variant="tonal"
          class="mt-4"
        >
          <div class="text-body-2">
            <span class="font-weight-bold">All data exported: </span>
            <template v-if="postprocessStore.unifiedProgress && postprocessStore.unifiedProgress.total > 1">
              Data spreadsheet and {{ postprocessStore.unifiedProgress.total - 1 }} media files saved to the disk
              <template v-if="postprocessStore.unifiedProgress.skipped > 0">
                ({{ postprocessStore.unifiedProgress.skipped }} already downloaded skipped)
              </template>
            </template>
            <template v-else>
              Data spreadsheet saved to selected folder
            </template>
          </div>
        </v-alert>

        <v-alert
          v-if="postprocessStore.mediaExportState === 'error'"
          type="error"
          class="mt-3"
        >
          {{ postprocessStore.mediaExportError }}
        </v-alert>

        <v-expansion-panels
          v-if="
            postprocessStore.mediaProgress &&
            postprocessStore.mediaProgress.errors.length > 0
          "
          class="mt-3"
        >
          <v-expansion-panel
            :title="`Failed files (${postprocessStore.mediaProgress.errors.length})`"
          >
            <v-expansion-panel-text>
              <div
                v-for="(err, i) in postprocessStore.mediaProgress.errors"
                :key="i"
                class="text-body-2"
              >
                {{ err.disk_path }}: {{ err.error?.message || err.error }}
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <v-alert
          v-if="postprocessStore.exportState === 'error'"
          type="error"
          class="mt-3"
        >
          {{ postprocessStore.exportError }}
        </v-alert>
      </v-card>
    </template>

    <v-dialog v-model="serverDialog" max-width="480">
      <v-card>
        <v-card-title class="d-flex align-center ga-2 pt-5 px-6">
          <v-icon color="primary">mdi-server-network</v-icon>
          Change Kobo Server
        </v-card-title>
        <v-card-text class="px-6 pb-2">
          <v-text-field
            v-model="serverDialogUrl"
            label="Kobo server URL"
            variant="solo"
            density="compact"
            autofocus
            :disabled="serverDialogPending"
            @keyup.enter="applyServerUrl"
          />
          <div class="text-body-small text-medium-emphasis mt-2 mb-8">
            Changing the server may prompt the KoSurveyor extension to ask for
            permission to access the new server. The extension stores no data
            nor credentials, but you will need to grant access for the
            connection to work.
          </div>
          <v-alert
            v-if="serverDialogStatus && serverDialogOk === false"
            type="error"
            density="compact"
            variant="tonal"
            class="mt-2"
          >
            {{ serverDialogStatus }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn
            variant="text"
            :disabled="serverDialogPending"
            @click="serverDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            :loading="serverDialogPending"
            @click="applyServerUrl"
          >
            Apply
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      :model-value="postprocessStore.fileConflict !== null"
      max-width="480"
      persistent
    >
      <v-card v-if="postprocessStore.fileConflict">
        <v-card-title class="d-flex align-center ga-2 pt-5 px-6">
          <v-icon color="warning">mdi-file-replace-outline</v-icon>
          File already exists
        </v-card-title>
        <v-card-text class="px-6">
          <p class="text-body-1 mb-3">
            <strong>{{ postprocessStore.fileConflict.existingName }}</strong>
            already exists in the selected folder.
          </p>
          <p class="text-body-2 text-medium-emphasis">
            Would you like to overwrite it, save a new copy as
            <strong>{{ postprocessStore.fileConflict.suggestedName }}</strong
            >, or cancel the export?
          </p>
        </v-card-text>
        <v-card-actions class="px-6 pb-5 flex-wrap ga-2">
          <v-btn
            color="error"
            variant="tonal"
            prepend-icon="mdi-file-replace"
            @click="postprocessStore.resolveFileConflict('overwrite')"
          >
            Overwrite
          </v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-file-plus-outline"
            @click="postprocessStore.resolveFileConflict('rename')"
          >
            Save as {{ postprocessStore.fileConflict.suggestedName }}
          </v-btn>
          <v-spacer />
          <v-btn
            variant="text"
            @click="postprocessStore.resolveFileConflict('cancel')"
          >
            Cancel
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      :model-value="postprocessStore.fileWriteBlocked !== null"
      max-width="440"
    >
      <v-card v-if="postprocessStore.fileWriteBlocked">
        <v-card-title class="d-flex align-center ga-2 pt-5 px-6">
          <v-icon color="error">mdi-file-lock-outline</v-icon>
          File could not be saved
        </v-card-title>
        <v-card-text class="px-6">
          <p class="text-body-1 mb-3">
            <strong>{{ postprocessStore.fileWriteBlocked.fileName }}</strong>
            could not be written.
          </p>
          <p class="text-body-2 text-medium-emphasis mb-3">
            The file may be open in another application, or protected against
            changes. Please close it and try exporting again.
          </p>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn
            color="primary"
            variant="tonal"
            @click="postprocessStore.dismissFileWriteBlocked()"
          >
            Got it
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Media mix warning dialog -->
    <v-dialog
      :model-value="postprocessStore.mediaMixConflict !== null"
      max-width="500"
      persistent
    >
      <v-card v-if="postprocessStore.mediaMixConflict">
        <v-card-title class="d-flex align-center ga-2 pt-5 px-6">
          <v-icon color="warning">mdi-folder-alert-outline</v-icon>
          Media folder is not empty
        </v-card-title>
        <v-card-text class="px-6">
          <p class="text-body-1 mb-3">
            The selected folder already contains media files from other
            submissions. Downloading into the same folder will mix files from
            different exports.
          </p>
          <v-expansion-panels variant="accordion" density="compact" class="mb-3">
            <v-expansion-panel
              :title="`Existing folders (${postprocessStore.mediaMixConflict.foreignSessions.length})`"
            >
              <v-expansion-panel-text>
                <div
                  v-for="s in postprocessStore.mediaMixConflict.foreignSessions"
                  :key="s"
                  class="text-body-2"
                >
                  {{ s }}
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
          <p class="text-body-2 text-medium-emphasis">
            Do you want to continue downloading into this folder?
          </p>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-btn
            variant="text"
            @click="postprocessStore.resolveMediaMixConflict(false)"
          >
            Cancel media download
          </v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-download"
            @click="postprocessStore.resolveMediaMixConflict(true)"
          >
            Continue anyway
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useCredentialsStore } from "@/stores/credentials";
import { usePostprocessStore } from "@/stores/postprocess";

const credentialsStore = useCredentialsStore();
const postprocessStore = usePostprocessStore();

const extensionDetected = ref(false);

// ── Change server dialog ──────────────────────────────────────────────────────
const serverDialog = ref(false);
const serverDialogUrl = ref("");
const serverDialogStatus = ref(null);
const serverDialogOk = ref(null);
const serverDialogPending = ref(false);

function openServerDialog() {
  serverDialogUrl.value = credentialsStore.koboUrl;
  serverDialogStatus.value = null;
  serverDialogOk.value = null;
  serverDialogPending.value = false;
  serverDialog.value = true;
}

function applyServerUrl() {
  const newUrl = serverDialogUrl.value.trim();
  serverDialogPending.value = true;
  serverDialogStatus.value = null;
  serverDialogOk.value = null;

  const statusHandler = (event) => {
    const { success, error, origin } = event.detail;
    serverDialogPending.value = false;
    if (success) {
      credentialsStore.updateKoboUrl(origin ?? newUrl);
      serverDialog.value = false;
    } else {
      serverDialogOk.value = false;
      serverDialogStatus.value =
        error ?? "Extension rejected the new server URL.";
    }
    window.removeEventListener("kosurveyor-set-origin-status", statusHandler);
  };

  window.addEventListener("kosurveyor-set-origin-status", statusHandler);
  window.dispatchEvent(
    new CustomEvent("kosurveyor-set-origin", { detail: { url: newUrl } }),
  );

  setTimeout(() => {
    if (!serverDialogPending.value) return;
    window.removeEventListener("kosurveyor-set-origin-status", statusHandler);
    serverDialogPending.value = false;
    serverDialogOk.value = false;
    serverDialogStatus.value =
      "Extension did not respond — it may not be installed or active. Refresh the page and make sure the KoSurveyor extension is installed and enabled.";
  }, 3000);
}
const CONNECTION_PANEL_KEY = "kosu-connection-panel";
const connectionPanel = ref(
  localStorage.getItem(CONNECTION_PANEL_KEY) ?? "connection",
);
watch(connectionPanel, (val) => {
  if (val === null) {
    localStorage.removeItem(CONNECTION_PANEL_KEY);
  } else {
    localStorage.setItem(CONNECTION_PANEL_KEY, val);
  }
});
const page = ref(1);
const ITEMS_PER_PAGE = 10;

const pageCount = computed(() => {
  return Math.max(
    1,
    Math.ceil(postprocessStore.filteredSubmissions.length / ITEMS_PER_PAGE),
  );
});

const paginatedSubmissions = computed(() => {
  const start = (page.value - 1) * ITEMS_PER_PAGE;
  return postprocessStore.filteredSubmissions.slice(
    start,
    start + ITEMS_PER_PAGE,
  );
});

const allFilteredSelected = computed(() => {
  const filtered = postprocessStore.filteredSubmissions;
  return (
    filtered.length > 0 &&
    filtered.every((s) => postprocessStore.selectedIds.includes(s._id))
  );
});

const someFilteredSelected = computed(() => {
  return postprocessStore.filteredSubmissions.some((s) =>
    postprocessStore.selectedIds.includes(s._id),
  );
});

const selectedFormName = computed(() => {
  const asset = postprocessStore.assets.find(
    (a) => a.uid === postprocessStore.selectedAssetUid,
  );
  return asset?.name || "";
});

const isExporting = computed(() => {
  const s = postprocessStore.exportState;
  const ms = postprocessStore.mediaExportState;
  return (
    (s !== null && s !== "done" && s !== "error") ||
    ms === "preparing" || ms === "running"
  );
});

const unifiedExportDone = computed(() => {
  const ms = postprocessStore.mediaExportState;
  return ms === null || ms === "done";
});

const mediaLabel = computed(() => {
  const n = postprocessStore.mediaFileCount;
  return n > 0
    ? `Also download media files (${n})`
    : "Selected submissions contain no media files";
});

function handleUnifiedExport() {
  postprocessStore.exportSelected();
}

watch(
  () => postprocessStore.selectedAssetUid,
  (uid) => {
    if (uid) {
      connectionPanel.value = null;
      localStorage.removeItem(CONNECTION_PANEL_KEY);
    }
  },
);

function onToggleAll(checked) {
  if (checked) {
    postprocessStore.selectAllFiltered();
  } else {
    postprocessStore.clearSelection();
  }
}

onMounted(() => {
  if (window.__kosurveyorExtension) {
    extensionDetected.value = true;
    if (window.__kosurveyorOrigin) {
      credentialsStore.updateKoboUrl(window.__kosurveyorOrigin);
    }
  }
});
</script>
