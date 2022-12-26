<script lang="ts">
    import { navigating } from '$app/stores'
</script>

{#if $navigating}
    <h1>LOADING !</h1>
{:else}
    <slot/>
{/if}
