<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_root_opens_the_login_form_for_a_visitor()
    {
        $response = $this->get(route('home'));

        $response->assertRedirect('/login');
    }

    public function test_the_root_sends_an_authenticated_user_to_the_dashboard()
    {
        $this->actingAs(User::factory()->create());

        $this->get(route('home'))->assertRedirect('/login');
        $this->get('/login')->assertRedirect(route('dashboard'));
    }
}
