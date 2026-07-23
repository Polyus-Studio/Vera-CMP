<script setup lang="ts">
// The module auto-imports useVeraCmp(); reference it to validate the import.
const cmp = useVeraCmp()
</script>

<template>
  <div>
    <p>Vera CMP Nuxt fixture</p>
    <button @click="cmp.open()">Cookie settings</button>
  </div>
</template>
