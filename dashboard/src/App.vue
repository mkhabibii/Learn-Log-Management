<script setup>
import { ref, onMounted, computed } from "vue";

const logs = ref([]);
const filterLevel = ref("")
const filterService = ref("")

async function fetchLogs() {
  const params = new URLSearchParams();

  if (filterLevel.value) {
    params.append("level", filterLevel.value)
  }
  if (filterService.value) {
    params.append("service", filterService.value)
  }

  const response = await fetch(`http://localhost:3000/logs?${params.toString()}`)
  const data = await response.json();
  logs.value = data;
}

onMounted(() => {
  fetchLogs();
});

const totalLogs = computed(() => logs.value.length);

const totalErrors = computed(() => {
  return logs.value.filter((log) => log.level === "ERROR").length;
});

const totalWarnings = computed(() => {
  return logs.value.filter((log) => log.level === "WARN").length;
});

const totalServices = computed(() => {
  const uniqueServices = new Set(logs.value.map((log) => log.service));
  return uniqueServices.size;
});

function levelColor(level) {
  if (level === 'ERROR') return "bg-red-100 text-red-600";
  if (level === 'WARN') return "bg-yellow-100 text-yellow-600";
  return "bg-gray-100 text-blue-600";
}

</script>

<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <h1 class="text-3xl font-bold mb-6">Dashboard</h1>

    <div class="grid grid-cols-4 gap-4 mb-8">
      <div class="bg-white p-4 shadow rounded-lg">
        <p class="text-sm text-gray-500">Total Logs</p>
        <p class="text-2xl font-bold text-gray-800">{{ totalLogs }}</p>
      </div>
      <div class="bg-white p-4 shadow rounded-lg">
        <p class="text-sm text-gray-500">Errors</p>
        <p class="text-2xl font-bold text-red-800">{{ totalErrors }}</p>
      </div>
      <div class="bg-white p-4 shadow rounded-lg">
        <p class="text-sm text-gray-500">Warnings</p>
        <p class="text-2xl font-bold text-yellow-600">{{ totalWarnings }}</p>
      </div>
      <div class="bg-white p-4 shadow rounded-lg">
        <p class="text-sm text-gray-500">Services</p>
        <p class="text-2xl font-bold text-blue-600">{{ totalServices }}</p>
      </div>
    </div>

    <div class="flex gap-3 mb-4">
      <select v-model="filterLevel" class="border rounded px-3 py-2 text-sm">
        <option value="">Semua Level</option>
        <option value="INFO">INFO</option>
        <option value="WARN">WARN</option>
        <option value="ERROR">ERROR</option>
      </select>

      <input v-model="filterService" type="text" placeholder="Filter service ..." class="border rounded px-3 py-2 text-sm"/>
      <button @click="fetchLogs" class="bg-gray-800 text-white px-4 py-2 rounded text-sm cursor-pointer hover:bg-gray-700">
        Terapkan Filter
      </button>
    </div>

    <div class="bg-white rounded-lg shadow divide-y">
      <div
        v-for="log in logs"
        :key="log.id"
        class="p-4 flex items-center gap-3"
      >
        <span
          class="text-xs font-semibold px-2 py-1 rounded"
          :class="levelColor(log.level)"
        >
          {{ log.level }}
        </span>
        <span class="text-sm text-gray-500">{{ log.service }}</span>
        <span class="text-sm text-gray-700">{{ log.message }}</span>
      </div>
    </div>
  </div>
</template>
