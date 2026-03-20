<template>
  <div class="gs-step" :class="{ 'gs-step--last': isLast, 'gs-step--locked': locked }">
    <!-- Left track: badge + vertical connector line -->
    <div class="gs-track" aria-hidden="true">
      <div class="gs-badge" :class="`gs-badge--${effectiveStatus}`">
        <v-icon v-if="effectiveStatus === 'complete'" size="14" color="white">mdi-check</v-icon>
        <v-icon v-else-if="effectiveStatus === 'error'" size="14" color="white">mdi-close</v-icon>
        <v-icon v-else-if="effectiveStatus === 'warning'" size="14" color="white">mdi-alert</v-icon>
        <span v-else class="gs-num">{{ number }}</span>
      </div>
      <div v-if="!isLast" class="gs-line" :class="`gs-line--${effectiveStatus}`" />
    </div>

    <!-- Right: step card -->
    <div class="gs-card mb-6">
      <!-- Header -->
      <div
        class="gs-header"
        :class="[`gs-header--${effectiveStatus}`, { 'cursor-pointer': isCollapsible }]"
        @click="handleHeaderClick"
      >
        <span class="text-subtitle-2 font-weight-bold">{{ title }}</span>
        <div class="d-flex align-center gap-2 flex-shrink-0">
          <template v-if="locked">
            <v-icon size="14" class="text-disabled">mdi-lock-outline</v-icon>
            <span class="text-caption text-disabled">Complete previous steps first</span>
          </template>
          <template v-else>
            <v-chip
              v-if="chipVisible"
              :color="chipColor"
              size="x-small"
              label
            >{{ chipText }}</v-chip>
            <v-icon v-if="isCollapsible" size="18" class="text-medium-emphasis">
              {{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
            </v-icon>
          </template>
        </div>
      </div>

      <!-- Collapsed summary (shown when step is complete and not expanded) -->
      <Transition name="gs-fade">
        <div v-if="!expanded && status === 'complete' && summary" class="gs-summary">
          <span class="text-body-2 text-medium-emphasis">{{ summary }}</span>
          <v-btn
            variant="text"
            size="x-small"
            density="compact"
            class="ml-auto text-primary"
            @click.stop="$emit('expand')"
          >
            Edit
          </v-btn>
        </div>
      </Transition>

      <!-- Step body -->
      <v-expand-transition>
        <div v-if="expanded && !locked" class="gs-body">
          <slot />
        </div>
      </v-expand-transition>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  number:   { type: Number, required: true },
  title:    { type: String, required: true },
  /** idle | active | complete | warning | error */
  status:   { type: String, default: 'idle' },
  summary:  { type: String, default: '' },
  locked:   { type: Boolean, default: false },
  expanded: { type: Boolean, default: false },
  isLast:   { type: Boolean, default: false },
})

const emit = defineEmits(['expand', 'collapse'])

const effectiveStatus = computed(() => props.locked ? 'idle' : props.status)

const isCollapsible = computed(() => !props.locked && props.status === 'complete')

const chipVisible = computed(() =>
  !props.locked && !['idle', 'active'].includes(props.status)
)

const chipColor = computed(() => ({
  complete: 'success',
  warning:  'warning',
  error:    'error',
}[props.status] ?? 'grey'))

const chipText = computed(() => ({
  complete: 'Complete',
  warning:  'Warning',
  error:    'Error',
}[props.status] ?? props.status))

function handleHeaderClick() {
  if (!isCollapsible.value) return
  emit(props.expanded ? 'collapse' : 'expand')
}
</script>

<style scoped>
/* ── Layout ─────────────────────────────────────────────────────────── */
.gs-step {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

/* ── Track ──────────────────────────────────────────────────────────── */
.gs-track {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 32px;
  padding-top: 10px; /* vertically align badge with card header text */
}

.gs-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.25s ease, box-shadow 0.25s ease;
}

.gs-num {
  font-size: 13px;
  font-weight: 700;
}

.gs-badge--idle {
  background: rgb(var(--v-theme-surface));
  border: 2px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) * 2));
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.gs-badge--active {
  background: rgb(var(--v-theme-primary));
  color: white;
  box-shadow: 0 0 0 5px rgba(var(--v-theme-primary), 0.15);
}

.gs-badge--complete {
  background: rgb(var(--v-theme-success));
  color: white;
}

.gs-badge--warning {
  background: rgb(var(--v-theme-warning));
  color: white;
}

.gs-badge--error {
  background: rgb(var(--v-theme-error));
  color: white;
}

.gs-line {
  width: 2px;
  flex: 1;
  min-height: 24px;
  margin-top: 6px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
  transition: background 0.3s ease;
}

.gs-line--complete { background: rgba(var(--v-theme-success), 0.35); }
.gs-line--warning  { background: rgba(var(--v-theme-warning), 0.35); }
.gs-line--error    { background: rgba(var(--v-theme-error),   0.35); }

/* ── Card ───────────────────────────────────────────────────────────── */
.gs-card {
  flex: 1;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  transition: border-color 0.2s ease, opacity 0.2s ease;
}

/* Header */
.gs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  gap: 12px;
  transition: background 0.2s ease;
}

.gs-header--idle    { background: rgba(var(--v-theme-on-surface), 0.03); }
.gs-header--active  {
  background: rgba(var(--v-theme-primary), 0.06);
  border-bottom: 2px solid rgb(var(--v-theme-primary));
}
.gs-header--complete { background: rgba(var(--v-theme-success), 0.05); }
.gs-header--warning  {
  background: rgba(var(--v-theme-warning), 0.08);
  border-bottom: 2px solid rgba(var(--v-theme-warning), 0.6);
}
.gs-header--error {
  background: rgba(var(--v-theme-error), 0.06);
  border-bottom: 2px solid rgba(var(--v-theme-error), 0.5);
}

/* Collapsed summary strip */
.gs-summary {
  display: flex;
  align-items: center;
  padding: 6px 16px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  gap: 8px;
  min-height: 36px;
}

/* Body */
.gs-body {
  padding: 20px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

/* Locked appearance */
.gs-step--locked .gs-card {
  opacity: 0.5;
  pointer-events: none;
}

.gs-step--locked .gs-badge {
  background: rgba(var(--v-theme-on-surface), 0.05);
  border: 2px dashed rgba(var(--v-border-color), calc(var(--v-border-opacity) * 3));
  color: rgba(var(--v-theme-on-surface), 0.3);
}

/* Transition */
.gs-fade-enter-active,
.gs-fade-leave-active { transition: opacity 0.2s ease; }
.gs-fade-enter-from,
.gs-fade-leave-to     { opacity: 0; }
</style>
