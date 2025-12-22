using Fjeller.SimpleMapper.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SimpleLyrics.Contracts.Repositories;
using SimpleLyrics.Contracts.Services;
using SimpleLyrics.Core.Mapping;
using SimpleLyrics.Core.Services;
using SimpleLyrics.Data.SqlServer.DataAccess.Context;
using SimpleLyrics.Data.SqlServer.Mapping;
using SimpleLyrics.Data.SqlServer.Repositories;

namespace SimpleLyrics.Extensions;

public static class ServiceCollectionExtensions
{
	private const string _SETTINGSNAME_CONNECTIONSTRING = "DefaultConnection";

	public static IServiceCollection AddSimpleLyricsServices( this IServiceCollection services, IConfiguration configuration )
	{
		string connectionString = configuration.GetConnectionString( _SETTINGSNAME_CONNECTIONSTRING )
			?? throw new InvalidOperationException( $"Connection string '{_SETTINGSNAME_CONNECTIONSTRING}' not found in configuration." );

		services.AddDbContextFactory<SongsDataContext>( o => o.UseSqlServer( connectionString ) );

		services.AddSimpleMapper( typeof( DataMappingProfile ).Assembly, typeof( CoreMappingProfile ).Assembly );

		services.TryAddScoped<ISongRepository, SongRepository>();
		services.TryAddScoped<ISongService, SongService>();

		return services;
	}
}
