<!-- src/routes/logout.svelte -->

<script lang="ts">
    import { onMount } from "svelte";
    import { clearToken } from "../auth";
    import { goto } from '$app/navigation';

    onMount(() => {
        clearToken();

        // Using window.location.href instead of router.redirect to refresh the page
        // so that components like Navbar update too
        window.location.href = "/";
    });
</script>

<h2 class="text-center text-lg pb-2 font-bold">Logging yout out...</h2>
