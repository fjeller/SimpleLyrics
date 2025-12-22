using Microsoft.FluentUI.AspNetCore.Components;
using Serilog;
using SimpleLyrics.Components;
using SimpleLyrics.Extensions;

namespace SimpleLyrics
{
	public class Program
	{
		public static void Main( string[] args )
		{
			Log.Logger = new LoggerConfiguration()
				.WriteTo.Console()
				.CreateBootstrapLogger();

			try
			{
				Log.Information( "Starting SimpleLyrics application" );

				WebApplicationBuilder builder = WebApplication.CreateBuilder( args );

				builder.Host.UseSerilog( ( context, services, configuration ) => configuration
					.ReadFrom.Configuration( context.Configuration )
					.ReadFrom.Services( services )
				);

				// Add services to the container.
				builder.Services.AddRazorComponents()
					.AddInteractiveServerComponents();
				builder.Services.AddFluentUIComponents();

				builder.Services.AddSimpleLyricsServices( builder.Configuration );

				WebApplication app = builder.Build();

				app.UseSerilogRequestLogging();

				// Configure the HTTP request pipeline.
				if ( !app.Environment.IsDevelopment() )
				{
					app.UseExceptionHandler( "/Error" );
					// The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
					app.UseHsts();
				}

				app.UseStatusCodePagesWithReExecute( "/not-found", createScopeForStatusCodePages: true );
				app.UseHttpsRedirection();

				app.UseAntiforgery();

				app.MapStaticAssets();
				app.MapRazorComponents<App>()
					.AddInteractiveServerRenderMode();

				Log.Information( "SimpleLyrics application started successfully" );

				app.Run();
			}
			catch ( Exception ex )
			{
				Log.Fatal( ex, "SimpleLyrics application terminated unexpectedly" );
			}
			finally
			{
				Log.CloseAndFlush();
			}
		}
	}
}
